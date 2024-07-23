/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { AGENT_ACTIONS_INDEX, AGENT_ACTIONS_RESULTS_INDEX } from '../../../common';
import { FILE_STORAGE_METADATA_AGENT_INDEX } from '../../constants';

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';

import { deleteAgentUploadFile, getAgentUploads } from './uploads';
import {
  AGENT_ACTIONS_FIXTURES,
  AGENT_ACTIONS_RESULTS_FIXTURES,
  FILES_METADATA_BY_ACTION_ID,
} from './uploads.test_fixtures';

describe('getAgentUploads', () => {
  const esClient = {} as ElasticsearchClient;

  beforeAll(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterAll(() => {
    appContextService.stop();
  });

  it('should return right list of files', async () => {
    esClient.search = jest.fn().mockImplementation(({ index, query }) => {
      if (index === AGENT_ACTIONS_INDEX) {
        return { hits: { hits: AGENT_ACTIONS_FIXTURES } };
      }

      if (index === AGENT_ACTIONS_RESULTS_INDEX) {
        return { hits: { hits: AGENT_ACTIONS_RESULTS_FIXTURES } };
      }

      if (index === FILE_STORAGE_METADATA_AGENT_INDEX) {
        const actionId = query.bool.filter.bool.must[1].term.action_id as string;
        if (FILES_METADATA_BY_ACTION_ID[actionId]) {
          return { hits: { hits: [FILES_METADATA_BY_ACTION_ID[actionId]] } };
        } else {
          return { hits: { hits: [] } };
        }
      }
    });

    const response = await getAgentUploads(esClient, 'agent-1');
    expect(response.length).toBe(7);
    expect(response.filter((i) => i.status === 'DELETED').length).toBe(0);
    response.forEach((item) => {
      expect(item.name).toBeDefined();
      if (item.status === 'READY') {
        expect(item.name).toEqual(`${item.id}.zip`);
      } else {
        expect(item.name).toMatch(new RegExp(`^elastic-agent-diagnostics-.*\.zip$`));
      }
    });
    expect(response.map(({ createTime, name, ...rest }) => rest)).toMatchSnapshot();
  });
});

describe('deleteAgentUploadFile', () => {
  const esClient = {} as ElasticsearchClient;
  const id = 'agent-upload-file-id';

  beforeAll(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterAll(() => {
    appContextService.stop();
  });

  describe('should return success', () => {
    it('if the file was deleted and metadata was updated normally', async () => {
      esClient.deleteByQuery = jest.fn().mockResolvedValueOnce({ deleted: 1 });
      esClient.updateByQuery = jest.fn().mockResolvedValueOnce({ total: 1 });
      const response = await deleteAgentUploadFile(esClient, id);
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
      expect(response).toEqual({ id, deleted: true });
    });
    it('if no files needed to be deleted and metadata was updated normally', async () => {
      esClient.deleteByQuery = jest.fn().mockResolvedValueOnce({ total: 0 });
      esClient.updateByQuery = jest.fn().mockResolvedValueOnce({ total: 1 });
      const response = await deleteAgentUploadFile(esClient, id);
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
      expect(response).toEqual({ id, deleted: true });
    });
  });

  describe('should throw an error', () => {
    it('if data file deletion failed due to ES client error', async () => {
      esClient.deleteByQuery = jest.fn().mockRejectedValueOnce(new Error('some es error'));
      esClient.updateByQuery = jest.fn();
      await expect(deleteAgentUploadFile(esClient, id)).rejects.toThrow('some es error');
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.updateByQuery).not.toHaveBeenCalled();
    });
    it('if data file deletion failed due to no files deleted', async () => {
      esClient.deleteByQuery = jest.fn().mockResolvedValueOnce({ deleted: 0, total: 1 });
      esClient.updateByQuery = jest.fn();
      await expect(deleteAgentUploadFile(esClient, id)).rejects.toThrow(
        `Failed to delete file ${id} from file storage data stream`
      );
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.updateByQuery).not.toHaveBeenCalled();
    });
    it('if metadata deletion failed due to ES client error', async () => {
      esClient.deleteByQuery = jest.fn().mockResolvedValueOnce({ total: 0 });
      esClient.updateByQuery = jest.fn().mockRejectedValueOnce(new Error('some es error'));
      await expect(deleteAgentUploadFile(esClient, id)).rejects.toThrow('some es error');
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    });
    it('if metadata deletion failed due to no files deleted', async () => {
      esClient.deleteByQuery = jest.fn().mockResolvedValueOnce({ total: 0 });
      esClient.updateByQuery = jest.fn().mockResolvedValueOnce({ total: 0 });
      await expect(deleteAgentUploadFile(esClient, id)).rejects.toThrow(
        `Failed to update file ${id} metadata`
      );
      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    });
  });
});
