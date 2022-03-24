/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';

import type { Agent } from '../../types';

import { getAgentsByKuery } from './crud';

jest.mock('../../../common', () => ({
  ...jest.requireActual('../../../common'),
  isAgentUpgradeable: jest.fn().mockImplementation((agent: Agent) => agent.id.includes('up')),
}));

describe('Agents CRUD test', () => {
  let esClientMock: ElasticsearchClient;
  let searchMock: jest.Mock;
  describe('getAgentsByKuery', () => {
    beforeEach(() => {
      searchMock = jest.fn();
      esClientMock = {
        search: searchMock,
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
  });
});
