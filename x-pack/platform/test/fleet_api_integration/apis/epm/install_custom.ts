/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGES_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const INTEGRATION_NAME = 'my_nginx';
const INTEGRATION_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');

  const uninstallPackage = async () => {
    await supertest
      .delete(`/api/fleet/epm/packages/${INTEGRATION_NAME}/${INTEGRATION_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('Installing custom integrations', () => {
    afterEach(async () => {
      await uninstallPackage();
    });

    it('Correctly installs a custom integration and all of its assets', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: `${INTEGRATION_NAME}.access`, type: 'logs' },
            { name: `${INTEGRATION_NAME}.error`, type: 'metrics' },
            { name: `${INTEGRATION_NAME}.warning`, type: 'logs' },
          ],
        })
        .expect(200);

      const expectedIngestPipelines = [
        `logs-${INTEGRATION_NAME}.access-1.0.0`,
        `metrics-${INTEGRATION_NAME}.error-1.0.0`,
        `logs-${INTEGRATION_NAME}.warning-1.0.0`,
      ];
      const expectedIndexTemplates = [
        `logs-${INTEGRATION_NAME}.access`,
        `metrics-${INTEGRATION_NAME}.error`,
        `logs-${INTEGRATION_NAME}.warning`,
      ];
      const expectedComponentTemplates = [
        `logs-${INTEGRATION_NAME}.access@package`,
        `logs-${INTEGRATION_NAME}.access@custom`,
        `metrics-${INTEGRATION_NAME}.error@package`,
        `metrics-${INTEGRATION_NAME}.error@custom`,
        `logs-${INTEGRATION_NAME}.warning@package`,
        `logs-${INTEGRATION_NAME}.warning@custom`,
      ];

      expect(response.body._meta.install_source).to.be('custom');

      const actualIngestPipelines = response.body.items
        .filter((item: any) => item.type === 'ingest_pipeline')
        .map((pipeline: any) => pipeline.id);

      const actualIndexTemplates = response.body.items
        .filter((item: any) => item.type === 'index_template')
        .map((template: any) => template.id);

      const actualComponentTemplates = response.body.items
        .filter((item: any) => item.type === 'component_template')
        .map((template: any) => template.id);

      expectedIngestPipelines.forEach((pipeline) => {
        expect(actualIngestPipelines).to.contain(pipeline);
      });
      expectedIndexTemplates.forEach((template) => {
        expect(actualIndexTemplates).to.contain(template);
      });
      expectedComponentTemplates.forEach((template) => {
        expect(actualComponentTemplates).to.contain(template);
      });

      const installation = await kibanaServer.savedObjects.get({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        id: INTEGRATION_NAME,
      });
      expect(installation.attributes.name).to.be(INTEGRATION_NAME);
      expect(installation.attributes.version).to.be(INTEGRATION_VERSION);
      expect(installation.attributes.install_source).to.be('custom');
      expect(installation.attributes.install_status).to.be('installed');

      for (const indexTemplate of actualIndexTemplates) {
        const templateResponse = await esClient.indices.getIndexTemplate({ name: indexTemplate });

        expect(templateResponse.index_templates[0].index_template.composed_of).to.contain(
          'ecs@mappings'
        );
      }
    });

    it('Includes custom integration metadata', async () => {
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: `${INTEGRATION_NAME}.access`, type: 'logs' }],
        })
        .expect(200);

      const indexName = `logs-${INTEGRATION_NAME}.access-000001`;

      // Actually index data to see if the mapping comes out as expected based on the component template stack
      await esClient.index({
        index: indexName,
        document: {
          foo: 'bar',
        },
      });

      const response = await esClient.indices.getMapping({ index: indexName });

      expect(Object.values(response)[0].mappings._meta).to.eql({
        managed_by: 'fleet',
        managed: true,
        package: { name: INTEGRATION_NAME },
      });
    });

    it('Works correctly when there is an existing datastream with the same name', async () => {
      const INTEGRATION_NAME_1 = 'myintegration';
      const DATASET_NAME = 'test';
      await esClient.transport.request({
        method: 'POST',
        path: `logs-${INTEGRATION_NAME_1}.${DATASET_NAME}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: `${DATASET_NAME}`,
          data_stream: {
            dataset: `${INTEGRATION_NAME_1}.${DATASET_NAME}_logs`,
            namespace: 'default',
            type: 'logs',
          },
        },
      });
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME_1,
          datasets: [{ name: `${INTEGRATION_NAME_1}.${DATASET_NAME}`, type: 'logs' }],
        })
        .expect(200);
    });

    it('Throws an error when there is a naming collision with a current package installation', async () => {
      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: `${INTEGRATION_NAME}.access`, type: 'logs' },
            { name: `${INTEGRATION_NAME}.error`, type: 'metrics' },
            { name: `${INTEGRATION_NAME}.warning`, type: 'logs' },
          ],
        })
        .expect(200);

      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [
            { name: `${INTEGRATION_NAME}.access`, type: 'logs' },
            { name: `${INTEGRATION_NAME}.error`, type: 'metrics' },
            { name: `${INTEGRATION_NAME}.warning`, type: 'logs' },
          ],
        })
        .expect(409);

      expect(response.body.message).to.be(
        `Failed to create the integration as an installation with the name ${INTEGRATION_NAME} already exists.`
      );
    });

    it('Throws an error when there is a naming collision with a registry package', async () => {
      const pkgName = 'apache';

      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: pkgName,
          datasets: [{ name: `${INTEGRATION_NAME}.error`, type: 'logs' }],
        })
        .expect(409);

      expect(response.body.message).to.be(
        `Failed to create the integration as an integration with the name ${pkgName} already exists in the package registry or as a bundled package.`
      );
    });

    it('Throws an error when dataset names are not prefixed correctly', async () => {
      const response = await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: 'error', type: 'logs' }],
        })
        .expect(422);

      expect(response.body.message).to.be(
        `Dataset names 'error' must either match integration name '${INTEGRATION_NAME}' exactly or be prefixed with integration name and a dot (e.g. '${INTEGRATION_NAME}.<dataset_name>').`
      );

      await uninstallPackage();

      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: INTEGRATION_NAME, type: 'logs' }],
        })
        .expect(200);

      await uninstallPackage();

      await supertest
        .post(`/api/fleet/epm/custom_integrations`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/json')
        .send({
          force: true,
          integrationName: INTEGRATION_NAME,
          datasets: [{ name: `${INTEGRATION_NAME}.error`, type: 'logs' }],
        })
        .expect(200);
    });
  });
}
