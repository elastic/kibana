/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { AGENTS_INDEX } from '../../constants';
import { createAppContextStartContractMock } from '../../mocks';
import type { Agent } from '../../types';
import { appContextService } from '../app_context';

import { auditLoggingService } from '../audit_logging';

import {
  closePointInTime,
  getAgentsByKuery,
  getAgentTags,
  openPointInTime,
  updateAgent,
} from './crud';

jest.mock('../audit_logging');
jest.mock('../../../common/services/is_agent_upgradeable', () => ({
  isAgentUpgradeable: jest.fn().mockImplementation((agent: Agent) => agent.id.includes('up')),
}));

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('Agents CRUD test', () => {
  const soClientMock = savedObjectsClientMock.create();
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  let esClientMock: ElasticsearchClient;
  let searchMock: jest.Mock;

  beforeEach(() => {
    searchMock = jest.fn();
    soClientMock.find = jest.fn().mockResolvedValue({ saved_objects: [] });
    esClientMock = {
      search: searchMock,
      openPointInTime: jest.fn().mockResolvedValue({ id: '1' }),
      closePointInTime: jest.fn(),
    } as unknown as ElasticsearchClient;

    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });

  function getEsResponse(ids: string[], total: number) {
    return {
      hits: {
        total,
        hits: ids.map((id: string) => ({
          _id: id,
          _source: {},
          fields: {
            status: ['inactive'],
          },
        })),
      },
    };
  }

  describe('getAgentTags', () => {
    it('should return tags from aggs', async () => {
      searchMock.mockResolvedValueOnce({
        aggregations: {
          tags: { buckets: [{ key: 'tag1' }, { key: 'tag2' }] },
        },
      });

      const result = await getAgentTags(soClientMock, esClientMock, { showInactive: false });

      expect(result).toEqual(['tag1', 'tag2']);
      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: { tags: { terms: { field: 'tags', size: 10000 } } },
          body: {
            query: expect.any(Object),
          },
          index: '.fleet-agents',
          size: 0,
          fields: ['status'],
          runtime_mappings: {
            status: expect.anything(),
          },
        })
      );
    });

    it('should return empty list if no agent tags', async () => {
      searchMock.mockResolvedValueOnce({
        aggregations: {
          tags: {},
        },
      });

      const result = await getAgentTags(soClientMock, esClientMock, { showInactive: false });

      expect(result).toEqual([]);
    });

    it('should return empty list if no agent index', async () => {
      searchMock.mockRejectedValueOnce(new errors.ResponseError({ statusCode: 404 } as any));

      const result = await getAgentTags(soClientMock, esClientMock, { showInactive: false });

      expect(result).toEqual([]);
    });

    it('should pass query when called with kuery', async () => {
      searchMock.mockResolvedValueOnce({
        aggregations: {
          tags: { buckets: [{ key: 'tag1' }, { key: 'tag2' }] },
        },
      });

      await getAgentTags(soClientMock, esClientMock, {
        showInactive: true,
        kuery: 'fleet-agents.policy_id: 123',
      });

      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: { tags: { terms: { field: 'tags', size: 10000 } } },
          body: {
            query: {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match: {
                      policy_id: '123',
                    },
                  },
                ],
              },
            },
          },
          index: '.fleet-agents',
          size: 0,
          fields: ['status'],
          runtime_mappings: {
            status: expect.anything(),
          },
        })
      );
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/171541
  describe.skip('getAgentsByKuery', () => {
    it('should return upgradeable on first page', async () => {
      searchMock
        .mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2', '3', '4', '5'], 7)))
        .mockImplementationOnce(() =>
          Promise.resolve(getEsResponse(['1', '2', '3', '4', '5', 'up', '7'], 7))
        );
      const result = await getAgentsByKuery(esClientMock, soClientMock, {
        showUpgradeable: true,
        showInactive: false,
        page: 1,
        perPage: 5,
      });

      expect(result).toEqual({
        agents: [
          {
            access_api_key: undefined,
            id: 'up',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
        ],
        page: 1,
        perPage: 5,
        total: 1,
      });
    });

    it('should return upgradeable from all pages', async () => {
      searchMock
        .mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2', '3', 'up', '5'], 7)))
        .mockImplementationOnce(() =>
          Promise.resolve(getEsResponse(['1', '2', '3', 'up', '5', 'up2', '7'], 7))
        );
      const result = await getAgentsByKuery(esClientMock, soClientMock, {
        showUpgradeable: true,
        showInactive: false,
        page: 1,
        perPage: 5,
      });

      expect(result).toEqual({
        agents: [
          {
            access_api_key: undefined,
            id: 'up',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
          {
            access_api_key: undefined,
            id: 'up2',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
        ],
        page: 1,
        perPage: 5,
        total: 2,
      });
    });

    it('should return upgradeable on second page', async () => {
      searchMock
        .mockImplementationOnce(() => Promise.resolve(getEsResponse(['up6', '7'], 7)))
        .mockImplementationOnce(() =>
          Promise.resolve(getEsResponse(['up1', 'up2', 'up3', 'up4', 'up5', 'up6', '7'], 7))
        );
      const result = await getAgentsByKuery(esClientMock, soClientMock, {
        showUpgradeable: true,
        showInactive: false,
        page: 2,
        perPage: 5,
      });

      expect(result).toEqual({
        agents: [
          {
            access_api_key: undefined,
            id: 'up6',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
        ],
        page: 2,
        perPage: 5,
        total: 6,
      });
    });

    it('should return upgradeable from one page when total is more than limit', async () => {
      searchMock.mockImplementationOnce(() =>
        Promise.resolve(getEsResponse(['1', '2', '3', 'up', '5'], 10001))
      );
      const result = await getAgentsByKuery(esClientMock, soClientMock, {
        showUpgradeable: true,
        showInactive: false,
        page: 1,
        perPage: 5,
      });

      expect(result).toEqual({
        agents: [
          {
            access_api_key: undefined,
            id: 'up',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
        ],
        page: 1,
        perPage: 5,
        total: 10001,
      });
    });

    it('should return second page', async () => {
      searchMock.mockImplementationOnce(() => Promise.resolve(getEsResponse(['6', '7'], 7)));
      const result = await getAgentsByKuery(esClientMock, soClientMock, {
        showUpgradeable: false,
        showInactive: false,
        page: 2,
        perPage: 5,
      });

      expect(result).toEqual({
        agents: [
          {
            access_api_key: undefined,
            id: '6',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
          {
            access_api_key: undefined,
            id: '7',
            packages: [],
            policy_revision: undefined,
            status: 'inactive',
          },
        ],
        page: 2,
        perPage: 5,
        total: 7,
      });
    });

    it('should pass secondary sort for default sort', async () => {
      searchMock.mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2'], 2)));
      await getAgentsByKuery(esClientMock, soClientMock, {
        showInactive: false,
      });

      expect(searchMock.mock.calls.at(-1)[0].sort).toEqual([
        { enrolled_at: { order: 'desc' } },
        { 'local_metadata.host.hostname.keyword': { order: 'asc' } },
      ]);
    });

    it('should not pass secondary sort for non-default sort', async () => {
      searchMock.mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2'], 2)));
      await getAgentsByKuery(esClientMock, soClientMock, {
        showInactive: false,
        sortField: 'policy_id',
      });
      expect(searchMock.mock.calls.at(-1)[0].sort).toEqual([{ policy_id: { order: 'desc' } }]);
    });
  });

  describe('update', () => {
    it('should write to audit log', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      esClient.update.mockResolvedValueOnce({} as any);

      await updateAgent(esClient, 'test-agent-id', { tags: ['new-tag'] });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: 'User updated agent [id=test-agent-id]',
      });
    });
  });

  describe('openPointInTime', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.openPointInTime.mockResolvedValueOnce({ id: 'test-pit' } as any);

      await openPointInTime(esClient, AGENTS_INDEX);

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User opened point in time query [index=${AGENTS_INDEX}] [pitId=test-pit]`,
      });
    });
  });

  describe('closePointInTime', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.closePointInTime.mockResolvedValueOnce({} as any);

      await closePointInTime(esClient, 'test-pit');

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User closing point in time query [pitId=test-pit]`,
      });
    });
  });
});
