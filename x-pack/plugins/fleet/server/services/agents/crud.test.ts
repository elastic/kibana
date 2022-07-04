/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';

import { errorsToResults, getAgentsByKuery, processAgentsInBatches } from './crud';

jest.mock('../../../common', () => ({
  ...jest.requireActual('../../../common'),
  isAgentUpgradeable: jest.fn().mockImplementation((agent: Agent) => agent.id.includes('up')),
}));

describe('Agents CRUD test', () => {
  let esClientMock: ElasticsearchClient;
  let searchMock: jest.Mock;

  beforeEach(() => {
    searchMock = jest.fn();
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
        })),
      },
    };
  }
  describe('getAgentsByKuery', () => {
    it('should return upgradeable on first page', async () => {
      searchMock
        .mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2', '3', '4', '5'], 7)))
        .mockImplementationOnce(() =>
          Promise.resolve(getEsResponse(['1', '2', '3', '4', '5', 'up', '7'], 7))
        );
      const result = await getAgentsByKuery(esClientMock, {
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
      const result = await getAgentsByKuery(esClientMock, {
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
      const result = await getAgentsByKuery(esClientMock, {
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
      const result = await getAgentsByKuery(esClientMock, {
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
      const result = await getAgentsByKuery(esClientMock, {
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
      await getAgentsByKuery(esClientMock, {
        showInactive: false,
      });

      expect(searchMock.mock.calls[searchMock.mock.calls.length - 1][0].body.sort).toEqual([
        { enrolled_at: { order: 'desc' } },
        { 'local_metadata.host.hostname.keyword': { order: 'asc' } },
      ]);
    });

    it('should not pass secondary sort for non-default sort', async () => {
      searchMock.mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2'], 2)));
      await getAgentsByKuery(esClientMock, {
        showInactive: false,
        sortField: 'policy_id',
      });
      expect(searchMock.mock.calls[searchMock.mock.calls.length - 1][0].body.sort).toEqual([
        { policy_id: { order: 'desc' } },
      ]);
    });
  });

  describe('processAgentsInBatches', () => {
    const mockProcessAgents = (agents: Agent[]) =>
      Promise.resolve({ items: agents.map((agent) => ({ id: agent.id, success: true })) });
    it('should return results for multiple batches', async () => {
      searchMock
        .mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2'], 3)))
        .mockImplementationOnce(() => Promise.resolve(getEsResponse(['3'], 3)));

      const response = await processAgentsInBatches(
        esClientMock,
        {
          kuery: 'active:true',
          batchSize: 2,
          showInactive: false,
        },
        mockProcessAgents
      );
      expect(response).toEqual({
        items: [
          { id: '1', success: true },
          { id: '2', success: true },
          { id: '3', success: true },
        ],
      });
    });

    it('should return results for one batch', async () => {
      searchMock.mockImplementationOnce(() => Promise.resolve(getEsResponse(['1', '2', '3'], 3)));

      const response = await processAgentsInBatches(
        esClientMock,
        {
          kuery: 'active:true',
          showInactive: false,
        },
        mockProcessAgents
      );
      expect(response).toEqual({
        items: [
          { id: '1', success: true },
          { id: '2', success: true },
          { id: '3', success: true },
        ],
      });
    });
  });

  describe('errorsToResults', () => {
    it('should transform errors to results', () => {
      const results = errorsToResults([{ id: '1' } as Agent, { id: '2' } as Agent], {
        '1': new Error('error'),
      });
      expect(results).toEqual([
        { id: '1', success: false, error: new Error('error') },
        { id: '2', success: true },
      ]);
    });

    it('should transform errors to results with skip success', () => {
      const results = errorsToResults(
        [{ id: '1' } as Agent, { id: '2' } as Agent],
        { '1': new Error('error') },
        undefined,
        true
      );
      expect(results).toEqual([{ id: '1', success: false, error: new Error('error') }]);
    });

    it('should transform errors to results preserve order', () => {
      const results = errorsToResults(
        [{ id: '1' } as Agent, { id: '2' } as Agent],
        { '1': new Error('error') },
        ['2', '1']
      );
      expect(results).toEqual([
        { id: '2', success: true },
        { id: '1', success: false, error: new Error('error') },
      ]);
    });
  });
});
