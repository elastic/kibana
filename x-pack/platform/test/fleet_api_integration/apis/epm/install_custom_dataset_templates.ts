/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { getInstallationInfo } from '../package_policy/helper';

const INTEGRATION_PKG = 'integration_to_input';
const INTEGRATION_PKG_VERSION = '1.0.0';
const INPUT_PKG = 'input_package_upgrade';
const INPUT_PKG_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  const installPackage = async (name: string, version: string) => {
    return supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const uninstallPackage = async (name: string, version: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
  };

  const createAgentPolicy = async (name: string) => {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({ name, namespace: 'default' })
      .expect(200);
    return res.body.item;
  };

  const deleteAgentPolicy = async (agentPolicyId?: string) => {
    if (!agentPolicyId) return;
    return supertest
      .post(`/api/fleet/agent_policies/delete`)
      .set('kbn-xsrf', 'xxxx')
      .send({ agentPolicyId })
      .expect(200);
  };

  const getIndexTemplate = async (name: string) => {
    try {
      const { index_templates: templates } = await es.indices.getIndexTemplate({ name });
      return templates?.[0]?.index_template ?? null;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  };

  const getComponentTemplate = async (name: string) => {
    try {
      const { component_templates: templates } = await es.cluster.getComponentTemplate({ name });
      return templates?.[0] ?? null;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  };

  const deleteIndexTemplateIfExists = async (name: string) => {
    try {
      await es.indices.deleteIndexTemplate({ name });
    } catch (e) {
      if (e.statusCode !== 404) {
        throw e;
      }
    }
  };

  interface CreatePackagePolicyOpts {
    agentPolicyId: string;
    packageName: string;
    packageVersion: string;
    inputId: string;
    streamId: string;
    dataset: string;
    extraVars?: Record<string, unknown>;
    createDatasetTemplates?: boolean;
    expectStatusCode?: number;
  }

  const createPackagePolicy = async ({
    agentPolicyId,
    packageName,
    packageVersion,
    inputId,
    streamId,
    dataset,
    extraVars = {},
    createDatasetTemplates,
    expectStatusCode = 200,
  }: CreatePackagePolicyOpts) => {
    const body: Record<string, any> = {
      policy_id: agentPolicyId,
      package: { name: packageName, version: packageVersion },
      name: `test-policy-${dataset}`,
      description: '',
      namespace: 'default',
      inputs: {
        [inputId]: {
          enabled: true,
          streams: {
            [streamId]: {
              enabled: true,
              vars: {
                paths: ['/tmp/test/log'],
                'data_stream.dataset': dataset,
                ...extraVars,
              },
            },
          },
        },
      },
    };
    if (createDatasetTemplates !== undefined) {
      body.create_dataset_templates = createDatasetTemplates;
    }

    const res = await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send(body)
      .expect(expectStatusCode);

    return res.body.item;
  };

  const findInstalledEs = (installedEs: any[], id: string) =>
    installedEs
      .filter((asset) => asset.id === id)
      .map(({ id: assetId, type }) => ({ id: assetId, type }));

  describe('EPM - custom dataset index templates on package policy creation', function () {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('integration package', () => {
      const datasets = ['int_ds_1', 'int_ds_2'];
      let agentPolicyId: string;

      beforeEach(async () => {
        await installPackage(INTEGRATION_PKG, INTEGRATION_PKG_VERSION);
        const agentPolicy = await createAgentPolicy('Custom dataset templates - integration');
        agentPolicyId = agentPolicy.id;
      });

      afterEach(async () => {
        await deleteAgentPolicy(agentPolicyId);
        await uninstallPackage(INTEGRATION_PKG, INTEGRATION_PKG_VERSION);
        for (const dataset of datasets) {
          await deleteIndexTemplateIfExists(`logs-${dataset}`);
        }
      });

      it('creates dataset index templates when create_dataset_templates is true', async () => {
        const dataset = 'int_ds_1';
        await createPackagePolicy({
          agentPolicyId,
          packageName: INTEGRATION_PKG,
          packageVersion: INTEGRATION_PKG_VERSION,
          inputId: 'logs-logfile',
          streamId: `${INTEGRATION_PKG}.log`,
          dataset,
          createDatasetTemplates: true,
        });

        const installation = await getInstallationInfo(
          supertest,
          INTEGRATION_PKG,
          INTEGRATION_PKG_VERSION
        );
        expect(findInstalledEs(installation.installed_es, `logs-${dataset}`)).to.eql([
          { id: `logs-${dataset}`, type: 'index_template' },
        ]);
        expect(findInstalledEs(installation.installed_es, `logs-${dataset}@package`)).to.eql([
          { id: `logs-${dataset}@package`, type: 'component_template' },
        ]);

        // The index template installed for a custom dataset on an integration package is
        // annotated with the origin data stream dataset and type.
        const indexTemplateAsset = installation.installed_es.find(
          (asset: any) => asset.id === `logs-${dataset}` && asset.type === 'index_template'
        );
        expect(indexTemplateAsset?.customDataStreamOriginDataset).to.eql(`${INTEGRATION_PKG}.log`);
        expect(indexTemplateAsset?.customDataStreamOriginType).to.eql('logs');

        expect(await getIndexTemplate(`logs-${dataset}`)).not.to.eql(null);
        expect(await getComponentTemplate(`logs-${dataset}@package`)).not.to.eql(null);
      });

      it('does not create dataset index templates by default for integration packages', async () => {
        const dataset = 'int_ds_2';
        await createPackagePolicy({
          agentPolicyId,
          packageName: INTEGRATION_PKG,
          packageVersion: INTEGRATION_PKG_VERSION,
          inputId: 'logs-logfile',
          streamId: `${INTEGRATION_PKG}.log`,
          dataset,
        });

        const installation = await getInstallationInfo(
          supertest,
          INTEGRATION_PKG,
          INTEGRATION_PKG_VERSION
        );
        expect(installation.installed_es.filter((asset: any) => asset.id.includes(dataset))).to.eql(
          []
        );

        expect(await getIndexTemplate(`logs-${dataset}`)).to.eql(null);
        expect(await getComponentTemplate(`logs-${dataset}@package`)).to.eql(null);
      });
    });

    describe('input package', () => {
      const datasets = ['in_ds_1', 'in_ds_2'];
      let agentPolicyId: string;

      beforeEach(async () => {
        await installPackage(INPUT_PKG, INPUT_PKG_VERSION);
        const agentPolicy = await createAgentPolicy('Custom dataset templates - input');
        agentPolicyId = agentPolicy.id;
      });

      afterEach(async () => {
        await deleteAgentPolicy(agentPolicyId);
        await uninstallPackage(INPUT_PKG, INPUT_PKG_VERSION);
        for (const dataset of datasets) {
          await deleteIndexTemplateIfExists(`logs-${dataset}`);
        }
      });

      it('creates dataset index templates by default for input packages', async () => {
        const dataset = 'in_ds_1';
        await createPackagePolicy({
          agentPolicyId,
          packageName: INPUT_PKG,
          packageVersion: INPUT_PKG_VERSION,
          inputId: 'logs-logfile',
          streamId: `${INPUT_PKG}.logs`,
          dataset,
          extraVars: { tags: ['tag1'] },
        });

        const installation = await getInstallationInfo(supertest, INPUT_PKG, INPUT_PKG_VERSION);
        expect(findInstalledEs(installation.installed_es, `logs-${dataset}`)).to.eql([
          { id: `logs-${dataset}`, type: 'index_template' },
        ]);
        expect(findInstalledEs(installation.installed_es, `logs-${dataset}@package`)).to.eql([
          { id: `logs-${dataset}@package`, type: 'component_template' },
        ]);

        expect(await getIndexTemplate(`logs-${dataset}`)).not.to.eql(null);
      });

      it('does not create dataset index templates when create_dataset_templates is false', async () => {
        const dataset = 'in_ds_2';
        await createPackagePolicy({
          agentPolicyId,
          packageName: INPUT_PKG,
          packageVersion: INPUT_PKG_VERSION,
          inputId: 'logs-logfile',
          streamId: `${INPUT_PKG}.logs`,
          dataset,
          extraVars: { tags: ['tag1'] },
          createDatasetTemplates: false,
        });

        const installation = await getInstallationInfo(supertest, INPUT_PKG, INPUT_PKG_VERSION);
        expect(installation.installed_es.filter((asset: any) => asset.id.includes(dataset))).to.eql(
          []
        );

        expect(await getIndexTemplate(`logs-${dataset}`)).to.eql(null);
        expect(await getComponentTemplate(`logs-${dataset}@package`)).to.eql(null);
      });
    });
  });
}
