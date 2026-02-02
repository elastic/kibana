/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Data streams common', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('Get', () => {
      const testDataStreamName = 'test-data-stream';

      before(async () => await svlDatastreamsHelpers.createDataStream(testDataStreamName));
      after(async () => await svlDatastreamsHelpers.deleteDataStream(testDataStreamName));

      describe('index mode of logs-*-* data streams', () => {
        const logsdbDataStreamName = 'logs-test-ds';

        before(async () => {
          await svlDatastreamsHelpers.createDataStream(logsdbDataStreamName);
        });

        after(async () => {
          await svlDatastreamsHelpers.deleteDataStream(logsdbDataStreamName);
        });

        const logsdbSettings: Array<{ enabled: boolean | null; indexMode: string }> = [
          { enabled: true, indexMode: 'logsdb' },
          { enabled: false, indexMode: 'standard' },
          { enabled: null, indexMode: 'logsdb' }, // In serverless Kibana, the cluster.logsdb.enabled setting is true by default, so logsdb index mode
        ];

        logsdbSettings.forEach(({ enabled, indexMode }) => {
          it(`returns ${indexMode} index mode if logsdb.enabled setting is ${enabled}`, async () => {
            await es.cluster.putSettings({
              body: {
                persistent: {
                  cluster: {
                    logsdb: {
                      enabled,
                    },
                  },
                },
              },
            });

            const { body: dataStream } = await supertest
              .get(`${API_BASE_PATH}/data_streams/${logsdbDataStreamName}`)
              .set(internalReqHeader)
              .set(roleAuthc.apiKeyHeader)
              .expect(200);

            expect(dataStream.indexMode).to.eql(indexMode);
          });
        });
      });
    });

    describe('Update', () => {
      const testDataStreamName = 'test-data-stream';

      before(async () => await svlDatastreamsHelpers.createDataStream(testDataStreamName));
      after(async () => await svlDatastreamsHelpers.deleteDataStream(testDataStreamName));

      it('updates the data retention of a DS', async () => {
        const { body, status } = await supertestWithoutAuth
          .put(`${API_BASE_PATH}/data_streams/data_retention`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            dataRetention: '7d',
            dataStreams: [testDataStreamName],
          });
        svlCommonApi.assertResponseStatusCode(200, status, body);

        expect(body).to.eql({ success: true });
      });

      it('sets data retention to infinite', async () => {
        const { body, status } = await supertestWithoutAuth
          .put(`${API_BASE_PATH}/data_streams/data_retention`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            dataStreams: [testDataStreamName],
          });
        svlCommonApi.assertResponseStatusCode(200, status, body);

        // Providing an infinite retention might not be allowed for a given project,
        // due to it having an existing max retention period. Because of this
        // we will only check whether the request was recieved by ES.
        expect(body.success).to.eql(true);
      });
    });

    describe('Delete', () => {
      const testDataStreamName1 = 'test-data-stream1';
      const testDataStreamName2 = 'test-data-stream2';

      before(async () => {
        await Promise.all([
          svlDatastreamsHelpers.createDataStream(testDataStreamName1),
          svlDatastreamsHelpers.createDataStream(testDataStreamName2),
        ]);
      });

      after(async () => {
        // The Delete API only deletes the data streams, so we still need to manually delete their
        // related index patterns to clean up.
        await Promise.all([
          svlDatastreamsHelpers.deleteComposableIndexTemplate(testDataStreamName1),
          svlDatastreamsHelpers.deleteComposableIndexTemplate(testDataStreamName2),
        ]);
      });

      it('deletes multiple data streams', async () => {
        const { body: b1, status: s1 } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/delete_data_streams`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .send({
            dataStreams: [testDataStreamName1, testDataStreamName2],
          });
        svlCommonApi.assertResponseStatusCode(200, s1, b1);

        const { body: b2, status: s2 } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName1}`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        svlCommonApi.assertResponseStatusCode(404, s2, b2);

        const { body: b3, status: s3 } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/data_streams/${testDataStreamName2}`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);
        svlCommonApi.assertResponseStatusCode(404, s3, b3);
      });
    });

    describe('Mappings from template', () => {
      const testDataStreamName1 = 'test-data-stream-mappings-1';

      before(async () => {
        await svlDatastreamsHelpers.createDataStream(testDataStreamName1);
      });

      after(async () => {
        await svlDatastreamsHelpers.deleteDataStream(testDataStreamName1);
      });

      it('Apply mapping from index template', async () => {
        const beforeMapping = await svlDatastreamsHelpers.getMapping(testDataStreamName1);
        expect(beforeMapping.properties).eql({
          '@timestamp': { type: 'date' },
        });
        await svlDatastreamsHelpers.updateIndexTemplateMappings(testDataStreamName1, {
          properties: {
            test: { type: 'integer' },
          },
        });
        const { body, status } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/data_streams/${testDataStreamName1}/mappings_from_template`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader);

        svlCommonApi.assertResponseStatusCode(200, status, body);

        const afterMapping = await svlDatastreamsHelpers.getMapping(testDataStreamName1);
        expect(afterMapping.properties).eql({
          '@timestamp': { type: 'date' },
          test: { type: 'integer' },
        });
      });
    });

    describe('Rollover', () => {
      const testDataStreamName1 = 'test-data-stream-rollover-1';

      before(async () => {
        await svlDatastreamsHelpers.createDataStream(testDataStreamName1);
      });

      after(async () => {
        await svlDatastreamsHelpers.deleteDataStream(testDataStreamName1);
      });

      it('Rollover datastreams', async () => {
        const { body, status } = await supertestWithoutAuth
          .post(`${API_BASE_PATH}/data_streams/${testDataStreamName1}/rollover`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        svlCommonApi.assertResponseStatusCode(200, status, body);

        const datastream = await svlDatastreamsHelpers.getDatastream(testDataStreamName1);

        expect(datastream.generation).equal(2);
      });
    });
  });
}
