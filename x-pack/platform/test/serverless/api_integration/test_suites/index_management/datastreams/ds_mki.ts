/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { DataStream } from '@kbn/index-management-plugin/common';
import getopts from 'getopts';
import type { ServerlessProjectType } from '@kbn/es';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;
  const config = getService('config');
  const svlDatastreamsHelpers = getService('svlDatastreamsHelpers');

  const options = getopts(config.get('kbnTestServer.serverArgs'));
  const projectType = options.serverless as ServerlessProjectType;

  describe('Data streams MKI', function () {
    this.tags(['skipSvlWorkplaceAI', 'skipSvlOblt', 'skipSvlSearch', 'skipSvlSec']);

    const testDataStreamName = 'test-data-stream';
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await svlDatastreamsHelpers.createDataStream(testDataStreamName);
    });
    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await svlDatastreamsHelpers.deleteDataStream(testDataStreamName);
    });
    it('returns an array of data streams', async () => {
      const { body: dataStreams, status } = await supertestWithoutAuth
        .get(`${API_BASE_PATH}/data_streams`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

      svlCommonApi.assertResponseStatusCode(200, status, dataStreams);

      expect(dataStreams).to.be.an('array');

      // returned array can contain automatically created data streams
      const testDataStream = dataStreams.find(
        (dataStream: DataStream) => dataStream.name === testDataStreamName
      );

      expect(testDataStream).to.be.ok();

      // ES determines these values so we'll just echo them back.
      const { name: indexName, uuid } = testDataStream!.indices[0];

      // Security MKI enforces a default project-level retention. Since we don't have a way of determining the project type, we'll just check for both cases.
      if (projectType === 'security') {
        expect(testDataStream).to.eql({
          name: testDataStreamName,
          lifecycle: {
            enabled: true,
            effective_retention: '396d',
            globalMaxRetention: '396d',
            retention_determined_by: 'default_global_retention',
          },
          privileges: {
            delete_index: true,
            manage_data_stream_lifecycle: true,
            read_failure_store: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
              preferILM: true,
              managedBy: 'Data stream lifecycle',
            },
          ],
          nextGenerationManagedBy: 'Data stream lifecycle',
          generation: 1,
          health: 'green',
          indexTemplateName: testDataStreamName,
          hidden: false,
          failureStoreEnabled: false,
          indexMode: 'standard',
          failureStoreRetention: {
            defaultRetentionPeriod: '30d',
            retentionDisabled: false,
          },
        });
      } else {
        expect(testDataStream).to.eql({
          name: testDataStreamName,
          lifecycle: {
            enabled: true,
          },
          privileges: {
            delete_index: true,
            manage_data_stream_lifecycle: true,
            read_failure_store: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              uuid,
              preferILM: true,
              managedBy: 'Data stream lifecycle',
            },
          ],
          nextGenerationManagedBy: 'Data stream lifecycle',
          generation: 1,
          health: 'green',
          indexTemplateName: testDataStreamName,
          hidden: false,
          failureStoreEnabled: false,
          indexMode: 'standard',
          failureStoreRetention: {
            defaultRetentionPeriod: '30d',
            retentionDisabled: false,
          },
        });
      }
    });

    it('returns a single data stream by ID', async () => {
      const { body: dataStream, status } = await supertestWithoutAuth
        .get(`${API_BASE_PATH}/data_streams/${testDataStreamName}`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader);

      svlCommonApi.assertResponseStatusCode(200, status, dataStream);

      // ES determines these values so we'll just echo them back.
      const { name: indexName, uuid } = dataStream.indices[0];
      const { storageSize, storageSizeBytes, ...dataStreamWithoutStorageSize } = dataStream;

      // Security MKI enforces a default project-level retention. Since we don't have a way of determining the project type, we'll just check for both cases.
      if (projectType === 'security') {
        expect(dataStreamWithoutStorageSize).to.eql({
          name: testDataStreamName,
          privileges: {
            delete_index: true,
            manage_data_stream_lifecycle: true,
            read_failure_store: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              managedBy: 'Data stream lifecycle',
              preferILM: true,
              uuid,
            },
          ],
          generation: 1,
          health: 'green',
          indexTemplateName: testDataStreamName,
          nextGenerationManagedBy: 'Data stream lifecycle',
          hidden: false,
          lifecycle: {
            enabled: true,
            effective_retention: '396d',
            globalMaxRetention: '396d',
            retention_determined_by: 'default_global_retention',
          },
          meteringDocsCount: 0,
          meteringStorageSize: '0b',
          meteringStorageSizeBytes: 0,
          failureStoreEnabled: false,
          indexMode: 'standard',
          failureStoreRetention: {
            defaultRetentionPeriod: '30d',
            retentionDisabled: false,
          },
        });
      } else {
        expect(dataStreamWithoutStorageSize).to.eql({
          name: testDataStreamName,
          privileges: {
            delete_index: true,
            manage_data_stream_lifecycle: true,
            read_failure_store: true,
          },
          timeStampField: { name: '@timestamp' },
          indices: [
            {
              name: indexName,
              managedBy: 'Data stream lifecycle',
              preferILM: true,
              uuid,
            },
          ],
          generation: 1,
          health: 'green',
          indexTemplateName: testDataStreamName,
          nextGenerationManagedBy: 'Data stream lifecycle',
          hidden: false,
          lifecycle: {
            enabled: true,
          },
          meteringDocsCount: 0,
          meteringStorageSize: '0b',
          meteringStorageSizeBytes: 0,
          failureStoreEnabled: false,
          indexMode: 'standard',
          failureStoreRetention: {
            defaultRetentionPeriod: '30d',
            retentionDisabled: false,
          },
        });
      }
    });
  });
}
