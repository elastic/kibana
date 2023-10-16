/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.managed_user_details.dsl';
import { managedUserDetails } from '.';
import type { AzureManagedUser } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import type { IEsSearchResponse } from '@kbn/data-plugin/public';
import type { ManagedUserDetailsRequestOptionsInput } from '../../../../../../common/api/search_strategy';
import { UsersQueries } from '../../../../../../common/api/search_strategy';

export const mockOptions: ManagedUserDetailsRequestOptionsInput = {
  defaultIndex: ['logs-*'],
  userName: 'test-user-name',
  factoryQueryType: UsersQueries.managedDetails,
};

export const mockSearchStrategyResponse: IEsSearchResponse<AzureManagedUser> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 124,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 1,
      failed: 0,
    },
    hits: {
      max_score: null,
      hits: [
        {
          _index: '.test',
          _id: '9AxbIocB-WLv2258YZtS',
          _score: null,
          _source: {
            agent: {
              name: 'docker-fleet-agent',
              id: '9528bb69-1511-4631-a5af-1d7e93c02009',
              type: 'filebeat',
              ephemeral_id: '914fd1fa-aa37-4ab4-b36d-972ab9b19cde',
              version: '8.8.0',
            },
            '@timestamp': '2023-02-23T20:03:17.489Z',
            host: {
              hostname: 'docker-fleet-agent',
              os: {
                kernel: '5.10.47-linuxkit',
                name: 'Ubuntu',
                type: 'linux',
                family: 'debian',
                version: '20.04.5 LTS (Focal Fossa)',
                platform: 'ubuntu',
              },
              ip: ['172.26.0.7'],
              name: 'docker-fleet-agent',
              id: 'cff3d165179d4aef9596ddbb263e3adb',
              mac: ['02-42-AC-1A-00-07'],
              architecture: 'x86_64',
            },
            event: {
              agent_id_status: 'verified',
              ingested: '2023-02-23T20:03:18Z',
              provider: 'Azure AD',
              kind: 'asset',
              action: 'user-discovered',
              type: ['user', 'info'],
              dataset: 'entityanalytics_azure.users',
            },
            user: {
              full_name: 'Test user',
              phone: ['1235559999'],
              last_name: 'Test last name',
              id: '39fac578-91fb-47f6-8f7a-fab05ce70d8b',
              first_name: 'Taylor',
              email: 'tes.user@elastic.co',
            },
          },
          sort: [1677182597489],
        },
      ],
    },
  },
  total: 21,
  loaded: 21,
};

describe('userDetails search strategy', () => {
  const buildManagedUserDetailsQuery = jest.spyOn(buildQuery, 'buildManagedUserDetailsQuery');

  afterEach(() => {
    buildManagedUserDetailsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      managedUserDetails.buildDsl(mockOptions);
      expect(buildManagedUserDetailsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await managedUserDetails.parse(mockOptions, mockSearchStrategyResponse);
      expect(result).toMatchSnapshot();
    });
  });
});
