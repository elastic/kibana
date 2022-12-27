/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { Agent } from '../../types';

import { getAgentsByKuery, getAgentTags } from './crud';

jest.mock('../../../common/services/is_agent_upgradeable', () => ({
  isAgentUpgradeable: jest.fn().mockImplementation((agent: Agent) => agent.id.includes('up')),
}));

describe('Agents CRUD test', () => {
  const soClientMock = savedObjectsClientMock.create();
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

      const result = await getAgentTags(esClientMock, { showInactive: false });

      expect(result).toEqual(['tag1', 'tag2']);
      expect(searchMock).toHaveBeenCalledWith({
        aggs: { tags: { terms: { field: 'tags', size: 10000 } } },
        body: {
          query: expect.any(Object),
        },
        index: '.fleet-agents',
        size: 0,
      });
    });

    it('should return empty list if no agent tags', async () => {
      searchMock.mockResolvedValueOnce({
        aggregations: {
          tags: {},
        },
      });

      const result = await getAgentTags(esClientMock, { showInactive: false });

      expect(result).toEqual([]);
    });

    it('should return empty list if no agent index', async () => {
      searchMock.mockRejectedValueOnce(new errors.ResponseError({ statusCode: 404 } as any));

      const result = await getAgentTags(esClientMock, { showInactive: false });

      expect(result).toEqual([]);
    });

    it('should pass query when called with kuery', async () => {
      searchMock.mockResolvedValueOnce({
        aggregations: {
          tags: { buckets: [{ key: 'tag1' }, { key: 'tag2' }] },
        },
      });

      await getAgentTags(esClientMock, {
        showInactive: true,
        kuery: 'fleet-agents.policy_id: 123',
      });

      expect(searchMock).toHaveBeenCalledWith({
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
      });
    });
  });

  describe('getAgentsByKuery', () => {
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
});
