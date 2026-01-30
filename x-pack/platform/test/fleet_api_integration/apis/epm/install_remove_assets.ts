/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { sortBy } from 'lodash';
import type { AssetReference } from '@kbn/fleet-plugin/common/types';
import {
  FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
  FLEET_INSTALL_FORMAT_VERSION,
} from '@kbn/fleet-plugin/server/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
import { cleanFleetIndices } from '../space_awareness/helpers';

function checkErrorWithResponseDataOrThrow(err: any) {
  if (!err?.response?.data) {
    throw err;
  }
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const es: Client = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const pkgName = 'all_assets';
  const pkgVersion = '0.1.0';
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;

  const uninstallPackage = async (pkg: string, version?: string) => {
    await supertest
      .delete(`/api/fleet/epm/packages/${pkg}${version ? `/${version}` : ''}`)
      .set('kbn-xsrf', 'xxxx');
  };
  const installPackage = async (pkg: string, version?: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkg}${version ? `/${version}` : '?prerelease=true'}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('installs and uninstalls all assets', () => {
    skipIfNoDockerRegistry(providerContext);

    describe('installs all assets when installing a package for the first time', () => {
      before(async () => {
        await fleetAndAgents.setup();
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await installPackage(pkgName, pkgVersion);
      });
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage(pkgName, pkgVersion);
      });
      expectAssetsInstalled({
        logsTemplateName,
        metricsTemplateName,
        pkgVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });

    describe('global assets', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();

        await cleanFleetIndices(es);
        await fleetAndAgents.setup();

        // Delete all fleet component templates and pipelines to simulate missing global assets
        const fleetIndexTemplateNames = await es.indices
          .getIndexTemplate({ name: '*' })
          .then((res) =>
            res.index_templates
              .filter((template) => template.index_template._meta?.managed_by === 'fleet')
              .map((template) => template.name)
          );
        await es.indices.deleteDataStream(
          { name: '.logs-endpoint.*,logs-*,metrics-*' },
          {
            ignore: [404],
          }
        );
        if (fleetIndexTemplateNames.length) {
          await es.indices.deleteIndexTemplate({ name: fleetIndexTemplateNames.join(',') });
        }
        await es.cluster.deleteComponentTemplate(
          {
            name: FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
          },
          {
            ignore: [404],
          }
        );
      });

      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();

        await cleanFleetIndices(es);
      });

      it('should install global assets if they are missing during package install', async () => {
        await installPackage(pkgName, pkgVersion);
        const template = await es.cluster.getComponentTemplate({
          name: FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
        });

        expect(template.component_templates.length).to.be(1);
      });
    });

    describe('uninstalls all assets when uninstalling a package', () => {
      // these tests ensure that uninstall works properly so make sure that the package gets installed and uninstalled
      // and then we'll test that not artifacts are left behind.
      before(async () => {
        if (isDockerRegistryEnabledOrSkipped(providerContext)) {
          await installPackage(pkgName, pkgVersion);
        }

        if (isDockerRegistryEnabledOrSkipped(providerContext)) {
          await uninstallPackage(pkgName, pkgVersion);
        }
      });

      it('should have uninstalled the index templates', async function () {
        const resLogsTemplate = await es.transport.request(
          {
            method: 'GET',
            path: `/_index_template/${logsTemplateName}`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resLogsTemplate.statusCode).equal(404);

        const resMetricsTemplate = await es.transport.request(
          {
            method: 'GET',
            path: `/_index_template/${metricsTemplateName}`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resMetricsTemplate.statusCode).equal(404);
      });
      it('should have uninstalled the component templates', async function () {
        const resPackage = await es.transport.request(
          {
            method: 'GET',
            path: `/_component_template/${logsTemplateName}@package`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resPackage.statusCode).equal(404);

        const resUserSettings = await es.transport.request(
          {
            method: 'GET',
            path: `/_component_template/${logsTemplateName}@custom`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resUserSettings.statusCode).equal(404);
      });
      it('should have uninstalled the pipelines', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(res.statusCode).equal(404);
        const resPipeline1 = await es.transport.request(
          {
            method: 'GET',
            path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline1`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resPipeline1.statusCode).equal(404);
        const resPipeline2 = await es.transport.request(
          {
            method: 'GET',
            path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline2`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(resPipeline2.statusCode).equal(404);
      });
      it('should have uninstalled the ml model', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_ml/trained_models/default`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(res.statusCode).equal(404);
      });
      it('should have uninstalled the transforms', async function () {
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/_transform/${pkgName}-test-default-${pkgVersion}`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(res.statusCode).equal(404);
      });
      it('should have deleted the index for the transform', async function () {
        // the  index is defined in the transform file
        const res = await es.transport.request(
          {
            method: 'GET',
            path: `/logs-all_assets.test_log_current_default`,
          },
          {
            ignore: [404],
            meta: true,
          }
        );
        expect(res.statusCode).equal(404);
      });
      it('should have uninstalled the kibana assets', async function () {
        let resDashboard;
        try {
          resDashboard = await kibanaServer.savedObjects.get({
            type: 'dashboard',
            id: 'sample_dashboard',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resDashboard = err;
        }
        expect(resDashboard.response.data.statusCode).equal(404);
        let resDashboard2;
        try {
          resDashboard2 = await kibanaServer.savedObjects.get({
            type: 'dashboard',
            id: 'sample_dashboard2',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resDashboard2 = err;
        }
        expect(resDashboard2.response.data.statusCode).equal(404);
        let resVis;
        try {
          resVis = await kibanaServer.savedObjects.get({
            type: 'visualization',
            id: 'sample_visualization',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resVis = err;
        }
        expect(resVis.response.data.statusCode).equal(404);
        let resSearch;
        try {
          resVis = await kibanaServer.savedObjects.get({
            type: 'search',
            id: 'sample_search',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resSearch = err;
        }
        expect(resSearch.response.data.statusCode).equal(404);
        let resIndexPattern;
        try {
          resIndexPattern = await kibanaServer.savedObjects.get({
            type: 'index-pattern',
            id: 'test-*',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resIndexPattern = err;
        }
        expect(resIndexPattern.response.data.statusCode).equal(404);
        let resOsqueryPackAsset;
        try {
          resOsqueryPackAsset = await kibanaServer.savedObjects.get({
            type: 'osquery-pack-asset',
            id: 'sample_osquery_pack_asset',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resOsqueryPackAsset = err;
        }
        expect(resOsqueryPackAsset.response.data.statusCode).equal(404);
        let resOsquerySavedQuery;
        try {
          resOsquerySavedQuery = await kibanaServer.savedObjects.get({
            type: 'osquery-saved-query',
            id: 'sample_osquery_saved_query',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          resOsquerySavedQuery = err;
        }
        expect(resOsquerySavedQuery.response.data.statusCode).equal(404);
        let securityAiPrompt;
        try {
          securityAiPrompt = await kibanaServer.savedObjects.get({
            type: 'security-ai-prompt',
            id: 'sample_security_ai_prompt',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          securityAiPrompt = err;
        }
        expect(securityAiPrompt.response.data.statusCode).equal(404);
      });
      it('should have removed the saved object', async function () {
        let res;
        try {
          res = await kibanaServer.savedObjects.get({
            type: 'epm-packages',
            id: 'all_assets',
          });
        } catch (err) {
          checkErrorWithResponseDataOrThrow(err);
          res = err;
        }
        expect(res.response.data.statusCode).equal(404);
      });
    });

    describe('reinstalls all assets', () => {
      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await installPackage(pkgName, pkgVersion);
        // reinstall
        await installPackage(pkgName, pkgVersion);
      });
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage(pkgName, pkgVersion);
      });
      expectAssetsInstalled({
        logsTemplateName,
        metricsTemplateName,
        pkgVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });

    describe('reinstalls all assets 0.2.0', () => {
      const expectedVersion = '0.2.0';

      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await installPackage(pkgName, expectedVersion);
        // reinstall
        await installPackage(pkgName, expectedVersion);
      });
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage(pkgName, expectedVersion);
      });

      expectAssetsInstalled({
        logsTemplateName,
        metricsTemplateName,
        pkgVersion: expectedVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });

    describe('reinstalls all assets (no version specified)', () => {
      const expectedVersion = '0.2.0';

      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await installPackage(pkgName);
        // reinstall
        await installPackage(pkgName);
      });
      after(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await uninstallPackage(pkgName);
      });

      expectAssetsInstalled({
        logsTemplateName,
        metricsTemplateName,
        pkgVersion: expectedVersion,
        pkgName,
        es,
        kibanaServer,
      });
    });
  });
}

const expectAssetsInstalled = ({
  logsTemplateName,
  metricsTemplateName,
  pkgVersion,
  pkgName,
  es,
  kibanaServer,
}: {
  logsTemplateName: string;
  metricsTemplateName: string;
  pkgVersion: string;
  pkgName: string;
  es: Client;
  kibanaServer: any;
}) => {
  it('should have installed the ILM policy', async function () {
    const resPolicy = await es.transport.request(
      {
        method: 'GET',
        path: `/_ilm/policy/all_assets`,
      },
      { meta: true }
    );
    expect(resPolicy.statusCode).equal(200);
  });
  it('should have installed the index templates', async function () {
    const resLogsTemplate = await es.transport.request(
      {
        method: 'GET',
        path: `/_index_template/${logsTemplateName}`,
      },
      { meta: true }
    );
    expect(resLogsTemplate.statusCode).equal(200);

    const resMetricsTemplate = await es.transport.request(
      {
        method: 'GET',
        path: `/_index_template/${metricsTemplateName}`,
      },
      { meta: true }
    );
    expect(resMetricsTemplate.statusCode).equal(200);
  });
  it('should have installed the pipelines', async function () {
    const res = await es.transport.request(
      {
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}`,
      },
      { meta: true }
    );
    expect(res.statusCode).equal(200);
    const resPipeline1 = await es.transport.request(
      {
        method: 'GET',
        path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline1`,
      },
      { meta: true }
    );
    expect(resPipeline1.statusCode).equal(200);
    if (pkgVersion === '0.1.0') {
      const resPipeline2 = await es.transport.request(
        {
          method: 'GET',
          path: `/_ingest/pipeline/${logsTemplateName}-${pkgVersion}-pipeline2`,
        },
        { meta: true }
      );
      expect(resPipeline2.statusCode).equal(200);
    }
  });
  it('should have installed the ml model', async function () {
    const res = await es.transport.request(
      {
        method: 'GET',
        path: `_ml/trained_models/default`,
      },
      { meta: true }
    );
    expect(res.statusCode).equal(200);
  });
  it('should have installed the component templates', async function () {
    const resPackage = await es.transport.request(
      {
        method: 'GET',
        path: `/_component_template/${logsTemplateName}@package`,
      },
      { meta: true }
    );
    expect(resPackage.statusCode).equal(200);
  });
  it('should have installed the kibana assets', async function () {
    // These are installed from Fleet along with every package
    const resIndexPatternLogs = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'logs-*',
    });
    expect(resIndexPatternLogs.id).equal('logs-*');
    const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'metrics-*',
    });
    expect(resIndexPatternMetrics.id).equal('metrics-*');

    // These are the assets from the package
    const resDashboard = await kibanaServer.savedObjects.get({
      type: 'dashboard',
      id: 'sample_dashboard',
    });
    expect(resDashboard.id).equal('sample_dashboard');
    expect(resDashboard.managed).be(true);
    expect(resDashboard.references.map((ref: any) => ref.id).includes('sample_tag')).equal(true);
    // sample_dashboard2 is only installed in version 0.1.0
    if (pkgVersion === '0.1.0') {
      const resDashboard2 = await kibanaServer.savedObjects.get({
        type: 'dashboard',
        id: 'sample_dashboard2',
      });
      expect(resDashboard2.id).equal('sample_dashboard2');

      expect(resDashboard2.managed).be(true);
    }
    const resVis = await kibanaServer.savedObjects.get({
      type: 'visualization',
      id: 'sample_visualization',
    });

    expect(resVis.id).equal('sample_visualization');
    expect(resVis.managed).be(true);
    if (pkgVersion === '0.1.0') {
      const resSearch = await kibanaServer.savedObjects.get({
        type: 'search',
        id: 'sample_search',
      });
      expect(resSearch.id).equal('sample_search');
      expect(resSearch.managed).be(true);
    } else if (pkgVersion === '0.2.0') {
      const resSearch = await kibanaServer.savedObjects.get({
        type: 'search',
        id: 'sample_search2',
      });
      expect(resSearch.id).equal('sample_search2');
      expect(resSearch.managed).be(true);
    }
    const resLens = await kibanaServer.savedObjects.get({
      type: 'lens',
      id: 'sample_lens',
    });

    expect(resLens.id).equal('sample_lens');
    expect(resLens.managed).be(true);
    const resMlModule = await kibanaServer.savedObjects.get({
      type: 'ml-module',
      id: 'sample_ml_module',
    });
    expect(resMlModule.id).equal('sample_ml_module');
    expect(resMlModule.managed).be(true);
    const resSecurityRule = await kibanaServer.savedObjects.get({
      type: 'security-rule',
      id: 'sample_security_rule',
    });
    expect(resSecurityRule.id).equal('sample_security_rule');
    expect(resSecurityRule.managed).be(true);
    const resOsqueryPackAsset = await kibanaServer.savedObjects.get({
      type: 'osquery-pack-asset',
      id: 'sample_osquery_pack_asset',
    });
    expect(resOsqueryPackAsset.id).equal('sample_osquery_pack_asset');
    expect(resOsqueryPackAsset.managed).be(true);
    const resOsquerySavedObject = await kibanaServer.savedObjects.get({
      type: 'osquery-saved-query',
      id: 'sample_osquery_saved_query',
    });
    expect(resOsquerySavedObject.id).equal('sample_osquery_saved_query');
    expect(resOsquerySavedObject.managed).be(true);
    if (pkgVersion === '0.1.0') {
      const resCloudSecurityPostureRuleTemplate = await kibanaServer.savedObjects.get({
        type: 'csp-rule-template',
        id: 'sample_csp_rule_template',
      });
      expect(resCloudSecurityPostureRuleTemplate.id).equal('sample_csp_rule_template');
      expect(resCloudSecurityPostureRuleTemplate.managed).be(true);
    } else {
      const resCloudSecurityPostureRuleTemplate = await kibanaServer.savedObjects.get({
        type: 'csp-rule-template',
        id: 'sample_csp_rule_template2',
      });
      expect(resCloudSecurityPostureRuleTemplate.id).equal('sample_csp_rule_template2');
      expect(resCloudSecurityPostureRuleTemplate.managed).be(true);
    }
    const resSecurityAiPrompt = await kibanaServer.savedObjects.get({
      type: 'security-ai-prompt',
      id: 'sample_security_ai_prompt',
    });
    expect(resSecurityAiPrompt.id).equal('sample_security_ai_prompt');
    expect(resSecurityAiPrompt.managed).be(true);
    const resTag = await kibanaServer.savedObjects.get({
      type: 'tag',
      id: 'sample_tag',
    });
    expect(resTag.managed).be(true);
    expect(resTag.id).equal('sample_tag');
    if (pkgVersion === '0.1.0') {
      const resIndexPattern = await kibanaServer.savedObjects.get({
        type: 'index-pattern',
        id: 'test-*',
      });
      expect(resIndexPattern.managed).be(true);
      expect(resIndexPattern.id).equal('test-*');
    }

    let resInvalidTypeIndexPattern;
    try {
      resInvalidTypeIndexPattern = await kibanaServer.savedObjects.get({
        type: 'invalid-type',
        id: 'invalid',
      });
    } catch (err) {
      checkErrorWithResponseDataOrThrow(err);
      resInvalidTypeIndexPattern = err;
    }
    expect(resInvalidTypeIndexPattern.response.data.statusCode).equal(404);
  });
  it('should not add fields to the index patterns', async () => {
    const resIndexPatternLogs = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'logs-*',
    });
    const logsAttributes = resIndexPatternLogs.attributes;
    expect(logsAttributes.fields).to.be(undefined);
    const resIndexPatternMetrics = await kibanaServer.savedObjects.get({
      type: 'index-pattern',
      id: 'metrics-*',
    });
    const metricsAttributes = resIndexPatternMetrics.attributes;
    expect(metricsAttributes.fields).to.be(undefined);
  });
  it('should have created the correct saved object', async function () {
    async function verifySO() {
      const res = await kibanaServer.savedObjects.get({
        type: 'epm-packages',
        id: 'all_assets',
      });
      // during a reinstall the items can change
      const sortedRes = {
        ...res.attributes,
        // verification_key_id can be null or undefined for install or reinstall cases,
        // kbn/expect only does strict equality so undefined is normalised to null
        verification_key_id:
          res.attributes.verification_key_id === undefined
            ? null
            : res.attributes.verification_key_id,
        installed_kibana: sortBy(res.attributes.installed_kibana, (o: AssetReference) => o.type),
        installed_es: sortBy(res.attributes.installed_es, (o: AssetReference) => o.type),
        package_assets: sortBy(res.attributes.package_assets, (o: AssetReference) => o.type),
      };

      const expectedSavedObject =
        pkgVersion === '0.1.0'
          ? {
              installed_kibana: [
                {
                  id: 'sample_alerting_rule_template',
                  type: 'alerting_rule_template',
                },
                {
                  id: 'sample_csp_rule_template',
                  type: 'csp-rule-template',
                },
                {
                  id: 'sample_dashboard',
                  type: 'dashboard',
                },
                {
                  id: 'sample_dashboard2',
                  type: 'dashboard',
                },
                {
                  id: 'test-*',
                  type: 'index-pattern',
                },
                {
                  id: 'sample_lens',
                  type: 'lens',
                },
                {
                  id: 'sample_ml_module',
                  type: 'ml-module',
                },
                {
                  id: 'sample_osquery_pack_asset',
                  type: 'osquery-pack-asset',
                },
                {
                  id: 'sample_osquery_saved_query',
                  type: 'osquery-saved-query',
                },
                {
                  id: 'sample_search',
                  type: 'search',
                },
                {
                  id: 'sample_security_ai_prompt',
                  type: 'security-ai-prompt',
                },
                {
                  id: 'sample_security_rule',
                  type: 'security-rule',
                },
                {
                  id: 'sample_slo_template',
                  type: 'slo_template',
                },
                {
                  id: 'sample_tag',
                  type: 'tag',
                },
                {
                  id: 'sample_visualization',
                  type: 'visualization',
                },
              ],
              installed_kibana_space_id: 'default',
              installed_es: [
                {
                  id: 'logs-all_assets.test_logs@package',
                  type: 'component_template',
                },
                {
                  id: 'logs@custom',
                  type: 'component_template',
                },
                {
                  id: 'all_assets@custom',
                  type: 'component_template',
                },
                {
                  id: 'logs-all_assets.test_logs@custom',
                  type: 'component_template',
                },
                {
                  id: 'metrics-all_assets.test_metrics@package',
                  type: 'component_template',
                },
                {
                  id: 'metrics@custom',
                  type: 'component_template',
                },
                {
                  id: 'metrics-all_assets.test_metrics@custom',
                  type: 'component_template',
                },
                {
                  id: 'logs-all_assets.test_logs-all_assets',
                  type: 'data_stream_ilm_policy',
                },
                {
                  id: 'metrics-all_assets.test_metrics-all_assets',
                  type: 'data_stream_ilm_policy',
                },
                {
                  id: 'all_assets',
                  type: 'ilm_policy',
                },
                {
                  id: 'logs-all_assets.test_logs',
                  type: 'index_template',
                },
                {
                  id: 'metrics-all_assets.test_metrics',
                  type: 'index_template',
                },
                {
                  id: 'logs-all_assets.test_logs-0.1.0',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-all_assets.test_logs-0.1.0-pipeline1',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-all_assets.test_logs-0.1.0-pipeline2',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'metrics-all_assets.test_metrics-0.1.0',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'default',
                  type: 'ml_model',
                },
              ],
              package_assets: [
                {
                  id: '333a22a1-e639-5af5-ae62-907ffc83d603',
                  path: 'all_assets-0.1.0/data_stream/test_logs/elasticsearch/ilm_policy/all_assets.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '256f3dad-6870-56c3-80a1-8dfa11e2d568',
                  path: 'all_assets-0.1.0/data_stream/test_logs/elasticsearch/ingest_pipeline/default.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '3fa0512f-bc01-5c2e-9df1-bc2f2a8259c8',
                  path: 'all_assets-0.1.0/data_stream/test_logs/elasticsearch/ingest_pipeline/pipeline1.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ea334ad8-80c2-5acd-934b-2a377290bf97',
                  path: 'all_assets-0.1.0/data_stream/test_logs/elasticsearch/ingest_pipeline/pipeline2.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '96c6eb85-fe2e-56c6-84be-5fda976796db',
                  path: 'all_assets-0.1.0/data_stream/test_logs/fields/ecs.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2d73a161-fa69-52d0-aa09-1bdc691b95bb',
                  path: 'all_assets-0.1.0/data_stream/test_logs/fields/fields.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0a00c2d2-ce63-5b9c-9aa0-0cf1938f7362',
                  path: 'all_assets-0.1.0/data_stream/test_logs/manifest.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '691f0505-18c5-57a6-9f40-06e8affbdf7a',
                  path: 'all_assets-0.1.0/data_stream/test_metrics/elasticsearch/ilm_policy/all_assets.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b36e6dd0-58f7-5dd0-a286-8187e4019274',
                  path: 'all_assets-0.1.0/data_stream/test_metrics/fields/ecs.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f839c76e-d194-555a-90a1-3265a45789e4',
                  path: 'all_assets-0.1.0/data_stream/test_metrics/fields/fields.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '9af7bbb3-7d8a-50fa-acc9-9dde6f5efca2',
                  path: 'all_assets-0.1.0/data_stream/test_metrics/manifest.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '1e97a20f-9d1c-529b-8ff2-da4e8ba8bb71',
                  path: 'all_assets-0.1.0/docs/README.md',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4510252e-f145-5dd8-ba78-85cc8746c7f7',
                  path: 'all_assets-0.1.0/elasticsearch/esql_view/test_query.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ed5d54d5-2516-5d49-9e61-9508b0152d2b',
                  path: 'all_assets-0.1.0/elasticsearch/ml_model/test/default.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bd5ff3c5-655e-5385-9918-b60ff3040aad',
                  path: 'all_assets-0.1.0/img/logo_overrides_64_color.svg',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6440faa4-fe21-5620-9989-f0f2b9f6944f',
                  path: 'all_assets-0.1.0/kibana/alerting_rule_template/sample_alerting_rule_template.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '943d5767-41f5-57c3-ba02-48e0f6a837db',
                  path: 'all_assets-0.1.0/kibana/csp_rule_template/sample_csp_rule_template.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0954ce3b-3165-5c1f-a4c0-56eb5f2fa487',
                  path: 'all_assets-0.1.0/kibana/dashboard/sample_dashboard.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '60d6d054-57e4-590f-a580-52bf3f5e7cca',
                  path: 'all_assets-0.1.0/kibana/dashboard/sample_dashboard2.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '47758dc2-979d-5fbe-a2bd-9eded68a5a43',
                  path: 'all_assets-0.1.0/kibana/index_pattern/invalid.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '318959c9-997b-5a14-b328-9fc7355b4b74',
                  path: 'all_assets-0.1.0/kibana/index_pattern/test_index_pattern.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e21b59b5-eb76-5ab0-bef2-1c8e379e6197',
                  path: 'all_assets-0.1.0/kibana/lens/sample_lens.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4c758d70-ecf1-56b3-b704-6d8374841b34',
                  path: 'all_assets-0.1.0/kibana/ml_module/sample_ml_module.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '313ddb31-e70a-59e8-8287-310d4652a9b7',
                  path: 'all_assets-0.1.0/kibana/osquery_pack_asset/sample_osquery_pack_asset.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '24a74223-5fdb-52ca-9cb5-b2cdd2a42b07',
                  path: 'all_assets-0.1.0/kibana/osquery_saved_query/sample_osquery_saved_query.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e786cbd9-0f3b-5a0b-82a6-db25145ebf58',
                  path: 'all_assets-0.1.0/kibana/search/sample_search.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5d12ad91-0624-5dce-800d-b1f9a7732f7c',
                  path: 'all_assets-0.1.0/kibana/security_ai_prompt/sample_security_ai_prompts.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd8b175c3-0d42-5ec7-90c1-d1e4b307a4c2',
                  path: 'all_assets-0.1.0/kibana/security_rule/sample_security_rule.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c09e8ecb-7030-5b81-8b93-890f0f3bd272',
                  path: 'all_assets-0.1.0/kibana/slo_template/nginx-availability.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b265a5e0-c00b-5eda-ac44-2ddbd36d9ad0',
                  path: 'all_assets-0.1.0/kibana/tag/sample_tag.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '53c94591-aa33-591d-8200-cd524c2a0561',
                  path: 'all_assets-0.1.0/kibana/visualization/sample_visualization.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'b658d2d4-752e-54b8-afc2-4c76155c1466',
                  path: 'all_assets-0.1.0/manifest.yml',
                  type: 'epm-packages-assets',
                },
              ],
              es_index_patterns: {
                test_logs: 'logs-all_assets.test_logs-*',
                test_metrics: 'metrics-all_assets.test_metrics-*',
              },
              name: 'all_assets',
              version: '0.1.0',
              install_version: '0.1.0',
              install_status: 'installed',
              install_started_at: res.attributes.install_started_at,
              install_source: 'registry',
              latest_install_failed_attempts: [],
              rolled_back: false,
              install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
              verification_status: 'unknown',
              verification_key_id: null,
            }
          : {
              installed_kibana: [
                {
                  id: 'sample_alerting_rule_template',
                  type: 'alerting_rule_template',
                },
                {
                  id: 'sample_csp_rule_template2',
                  type: 'csp-rule-template',
                },
                {
                  id: 'sample_dashboard',
                  type: 'dashboard',
                },
                {
                  id: 'sample_lens',
                  type: 'lens',
                },
                {
                  id: 'sample_ml_module',
                  type: 'ml-module',
                },
                {
                  id: 'sample_osquery_pack_asset',
                  type: 'osquery-pack-asset',
                },
                {
                  id: 'sample_osquery_saved_query',
                  type: 'osquery-saved-query',
                },
                {
                  id: 'sample_search2',
                  type: 'search',
                },
                {
                  id: 'sample_security_ai_prompt',
                  type: 'security-ai-prompt',
                },
                {
                  id: 'sample_security_rule',
                  type: 'security-rule',
                },
                {
                  id: 'sample_slo_template',
                  type: 'slo_template',
                },
                {
                  id: 'sample_tag',
                  type: 'tag',
                },
                {
                  id: 'sample_visualization',
                  type: 'visualization',
                },
              ],
              installed_kibana_space_id: 'default',
              installed_es: [
                {
                  type: 'ilm_policy',
                  id: 'all_assets',
                },
                {
                  id: 'default',
                  type: 'ml_model',
                },
                {
                  id: 'logs-all_assets.test_logs-0.2.0',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-all_assets.test_logs-0.2.0-pipeline1',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'logs-all_assets.test_logs2-0.2.0',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'metrics-all_assets.test_metrics-0.2.0',
                  type: 'ingest_pipeline',
                },
                {
                  id: 'all_assets-README.md',
                  type: 'knowledge_base',
                },
                {
                  id: 'logs-all_assets.test_logs-all_assets',
                  type: 'data_stream_ilm_policy',
                },
                {
                  id: 'logs-all_assets.test_logs',
                  type: 'index_template',
                },
                {
                  id: 'logs-all_assets.test_logs@package',
                  type: 'component_template',
                },
                {
                  id: 'logs@custom',
                  type: 'component_template',
                },
                {
                  id: 'all_assets@custom',
                  type: 'component_template',
                },
                {
                  id: 'logs-all_assets.test_logs@custom',
                  type: 'component_template',
                },
                {
                  id: 'logs-all_assets.test_logs2',
                  type: 'index_template',
                },
                {
                  id: 'logs-all_assets.test_logs2@package',
                  type: 'component_template',
                },
                {
                  id: 'logs-all_assets.test_logs2@custom',
                  type: 'component_template',
                },
                {
                  id: 'metrics-all_assets.test_metrics',
                  type: 'index_template',
                },
                {
                  id: 'metrics-all_assets.test_metrics@package',
                  type: 'component_template',
                },
                {
                  id: 'metrics@custom',
                  type: 'component_template',
                },
                {
                  id: 'metrics-all_assets.test_metrics@custom',
                  type: 'component_template',
                },
              ],
              package_assets: [
                {
                  id: '3eb4c54a-638f-51b6-84e2-d53f5a666e37',
                  path: 'all_assets-0.2.0/data_stream/test_logs/elasticsearch/ilm_policy/all_assets.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4acfbf69-7a27-5c58-9c99-7c86843d958f',
                  path: 'all_assets-0.2.0/data_stream/test_logs/elasticsearch/ingest_pipeline/default.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '938655df-b339-523c-a9e4-123c89c0e1e1',
                  path: 'all_assets-0.2.0/data_stream/test_logs/elasticsearch/ingest_pipeline/pipeline1.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'eec4606c-dbfa-565b-8e9c-fce1e641f3fc',
                  path: 'all_assets-0.2.0/data_stream/test_logs/fields/ecs.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'ef67e7e0-dca3-5a62-a42a-745db5ad7c1f',
                  path: 'all_assets-0.2.0/data_stream/test_logs/fields/fields.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '64239d25-be40-5e10-94b5-f6b74b8c5474',
                  path: 'all_assets-0.2.0/data_stream/test_logs/manifest.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '071b5113-4c9f-5ee9-aafe-d098a4c066f6',
                  path: 'all_assets-0.2.0/data_stream/test_logs2/fields/ecs.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '498d8215-2613-5399-9a13-fa4f0bf513e2',
                  path: 'all_assets-0.2.0/data_stream/test_logs2/fields/fields.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'd2f87071-c866-503a-8fcb-7b23a8c7afbf',
                  path: 'all_assets-0.2.0/data_stream/test_logs2/manifest.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5a080eba-f482-545c-8695-6ccbd426b2a2',
                  path: 'all_assets-0.2.0/data_stream/test_metrics/fields/ecs.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '28523a82-1328-578d-84cb-800970560200',
                  path: 'all_assets-0.2.0/data_stream/test_metrics/fields/fields.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cc1e3e1d-f27b-5d05-86f6-6e4b9a47c7dc',
                  path: 'all_assets-0.2.0/data_stream/test_metrics/manifest.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '5c3aa147-089c-5084-beca-53c00e72ac80',
                  path: 'all_assets-0.2.0/docs/README.md',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'f8da8ce3-77bb-5fa9-ad05-9f362684d494',
                  path: 'all_assets-0.2.0/elasticsearch/esql_view/test_query.yml',
                  type: 'epm-packages-assets',
                },
                {
                  id: '0c8c3c6a-90cb-5f0e-8359-d807785b046c',
                  path: 'all_assets-0.2.0/elasticsearch/ml_model/test/default.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '48e582df-b1d2-5f88-b6ea-ba1fafd3a569',
                  path: 'all_assets-0.2.0/img/logo_overrides_64_color.svg',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c5eaf69c-2dab-5678-a6e5-e586db4f3728',
                  path: 'all_assets-0.2.0/kibana/alerting_rule_template/sample_alerting_rule_template.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7f97600c-d983-53e0-ae2a-a59bf35d7f0d',
                  path: 'all_assets-0.2.0/kibana/csp_rule_template/sample_csp_rule_template.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'bf3b0b65-9fdc-53c6-a9ca-e76140e56490',
                  path: 'all_assets-0.2.0/kibana/dashboard/sample_dashboard.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '7f4c5aca-b4f5-5f0a-95af-051da37513fc',
                  path: 'all_assets-0.2.0/kibana/lens/sample_lens.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4281a436-45a8-54ab-9724-fda6849f789d',
                  path: 'all_assets-0.2.0/kibana/ml_module/sample_ml_module.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cb0bbdd7-e043-508b-91c0-09e4cc0f5a3c',
                  path: 'all_assets-0.2.0/kibana/osquery_pack_asset/sample_osquery_pack_asset.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '6a87d1a5-adf8-5a30-82c4-4c3b8298272b',
                  path: 'all_assets-0.2.0/kibana/osquery_saved_query/sample_osquery_saved_query.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '2e56f08b-1d06-55ed-abee-4708e1ccf0aa',
                  path: 'all_assets-0.2.0/kibana/search/sample_search2.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '848d7b69-26d1-52c1-8afc-65e627b34812',
                  path: 'all_assets-0.2.0/kibana/security_ai_prompt/sample_security_ai_prompts.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '4035007b-9c33-5227-9803-2de8a17523b5',
                  path: 'all_assets-0.2.0/kibana/security_rule/sample_security_rule.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'cf050fd1-4a35-50e7-b98c-4a48dfca5724',
                  path: 'all_assets-0.2.0/kibana/slo_template/nginx-availability.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'e6ae7d31-6920-5408-9219-91ef1662044b',
                  path: 'all_assets-0.2.0/kibana/tag/sample_tag.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: 'c7bf1a39-e057-58a0-afde-fb4b48751d8c',
                  path: 'all_assets-0.2.0/kibana/visualization/sample_visualization.json',
                  type: 'epm-packages-assets',
                },
                {
                  id: '8c665f28-a439-5f43-b5fd-8fda7b576735',
                  path: 'all_assets-0.2.0/manifest.yml',
                  type: 'epm-packages-assets',
                },
              ],
              es_index_patterns: {
                test_logs: 'logs-all_assets.test_logs-*',
                test_logs2: 'logs-all_assets.test_logs2-*',
                test_metrics: 'metrics-all_assets.test_metrics-*',
              },
              name: 'all_assets',
              version: '0.2.0',
              install_version: '0.2.0',
              install_status: 'installed',
              install_started_at: res.attributes.install_started_at,
              install_source: 'registry',
              latest_install_failed_attempts: [],
              rolled_back: false,
              install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
              verification_status: 'unknown',
              verification_key_id: null,
            };

      expectedSavedObject.installed_es
        .filter((item) => item.type !== 'knowledge_base') // Exclude knowledge_base types as they are installed asynchronously
        .forEach((item) => {
          expect(
            sortedRes.installed_es.find(
              (asset: any) => asset.type === item.type && asset.id === item.id
            )
          ).to.not.be(undefined);
        });
      expect({ ...sortedRes, installed_es: [] }).eql({
        ...expectedSavedObject,
        installed_es: [],
      });
    }

    await verifySO();
  });

  // TODO enable when feature flag is turned on https://github.com/elastic/kibana/issues/244655
  it.skip('should have installed the esql views', async function () {
    const res = (await es.transport.request({
      method: 'GET',
      path: `/_query/view/test_query`,
    })) as any;
    expect(res.views.test_query).not.to.be(undefined);
  });
};
