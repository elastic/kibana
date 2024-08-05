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
  SentinelOneGetActivitiesParams,
} from '../../../common/sentinelone/types';
import { API_PATH } from './sentinelone';
import { SentinelOneGetActivitiesResponseSchema } from '../../../common/sentinelone/schema';

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

  describe('#getActivities()', () => {
    it('should call sentinelone activities api with no query params', async () => {
      await connectorInstance.getActivities();

      expect(connectorInstance.requestSpy).toHaveBeenCalledWith({
        method: 'get',
        url: `${connectorInstance.constructorParams.config.url}${API_PATH}/activities`,
        params: {
          APIToken: 'token-abc',
        },
        responseSchema: SentinelOneGetActivitiesResponseSchema,
      });
    });

    it('should call sentinelone activities api with provided query params', async () => {
      const params: SentinelOneGetActivitiesParams = {
        ids: 'one, two',
        limit: 20,
        cursor: 'at-position-1',
      };
      await connectorInstance.getActivities(params);

      expect(connectorInstance.requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            APIToken: 'token-abc',
            ...params,
          },
        })
      );
    });
  });

  describe('#downloadRemoteScriptResults()', () => {
    it('should call SentinelOne api to retrieve task results', async () => {
      await connectorInstance.downloadRemoteScriptResults({ taskId: 'task-123' });

      expect(connectorInstance.requestSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${connectorInstance.constructorParams.config.url}${API_PATH}/remote-scripts/fetch-files`,
          data: { data: { taskIds: ['task-123'] } },
        })
      );
    });

    it('should error if task does not have a download url', async () => {
      connectorInstance.mockResponses.getRemoteScriptResults.data.download_links = [];

      await expect(
        connectorInstance.downloadRemoteScriptResults({ taskId: 'task-123' })
      ).rejects.toThrow('Download URL for script results of task id [task-123] not found');
    });

    it('should return a Stream for downloading the file', async () => {
      await expect(
        connectorInstance.downloadRemoteScriptResults({ taskId: 'task-123' })
      ).resolves.toEqual(connectorInstance.mockResponses.downloadRemoteScriptResults);
    });
  });
});
