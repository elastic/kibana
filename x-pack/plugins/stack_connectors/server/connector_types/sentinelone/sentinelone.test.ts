/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sentinelOneConnectorMocks } from './mocks';
import {
  SentinelOneDownloadAgentFileParams,
  SentinelOneFetchAgentFilesParams,
} from '../../../common/sentinelone/types';
import { API_PATH } from './sentinelone';

describe('SentinelOne Connector', () => {
  let connectorInstance: ReturnType<typeof sentinelOneConnectorMocks.create>;

  beforeEach(() => {
    connectorInstance = sentinelOneConnectorMocks.create();
  });

  describe('#fetchAgentFiles()', () => {
    let fetchAgentFilesParams: SentinelOneFetchAgentFilesParams;

    beforeEach(() => {
      fetchAgentFilesParams = {
        files: ['/tmp/one'],
        agentUUID: 'uuid-1',
        zipPassCode: 'foo',
      };
    });

    it('should error if agent UUID is invalid', async () => {
      connectorInstance.mockResponses.getAgentsApiResponse.data.length = 0;

      await expect(connectorInstance.fetchAgentFiles(fetchAgentFilesParams)).rejects.toHaveProperty(
        'message',
        'No agent found in SentinelOne for UUID [uuid-1]'
      );
    });

    it('should call SentinelOne fetch-files API with expected data', async () => {
      const fetchFilesUrl = `${connectorInstance.constructorParams.config.url}${API_PATH}/agents/1913920934584665209/actions/fetch-files`;
      const response = await connectorInstance.fetchAgentFiles(fetchAgentFilesParams);

      expect(response).toEqual({ data: { success: true }, errors: null });
      expect(connectorInstance.requestSpy).toHaveBeenLastCalledWith({
        url: fetchFilesUrl,
        method: 'post',
        data: {
          data: {
            password: 'foo',
            files: ['/tmp/one'],
          },
        },
        responseSchema: expect.any(Object),
        params: {
          APIToken: 'token-abc',
        },
      });
    });
  });

  describe('#downloadAgentFile()', () => {
    let downloadAgentFileParams: SentinelOneDownloadAgentFileParams;

    beforeEach(() => {
      downloadAgentFileParams = {
        agentUUID: 'uuid-1',
        activityId: '11111',
      };
    });

    it('should error if called with invalid agent UUID', async () => {
      connectorInstance.mockResponses.getAgentsApiResponse.data.length = 0;

      await expect(
        connectorInstance.downloadAgentFile(downloadAgentFileParams)
      ).rejects.toHaveProperty('message', 'No agent found in SentinelOne for UUID [uuid-1]');
    });

    it('should call SentinelOne api with expected url', async () => {
      await expect(connectorInstance.downloadAgentFile(downloadAgentFileParams)).resolves.toEqual(
        connectorInstance.mockResponses.downloadAgentFileApiResponse
      );
    });
  });
});
