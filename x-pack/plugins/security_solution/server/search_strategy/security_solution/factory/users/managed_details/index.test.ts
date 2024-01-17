/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.managed_user_details.dsl';
import { managedUserDetails } from '.';
import type { ManagedUserFields } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import type { IEsSearchResponse } from '@kbn/data-plugin/public';
import type { ManagedUserDetailsRequestOptionsInput } from '../../../../../../common/api/search_strategy';
import { UsersQueries } from '../../../../../../common/api/search_strategy';

export const mockOptions: ManagedUserDetailsRequestOptionsInput = {
  defaultIndex: ['logs-*'],
  userName: 'test-user-name',
  userEmail: ['test-user-name@mail.com'],
  factoryQueryType: UsersQueries.managedDetails,
};

export const mockSearchStrategyResponse: IEsSearchResponse<ManagedUserFields> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 5,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      max_score: null,
      hits: [],
    },
    aggregations: {
      datasets: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'entityanalytics_okta.user',
            doc_count: 122,
            latest_hit: {
              hits: {
                total: {
                  value: 122,
                  relation: 'eq',
                },
                max_score: null,
                hits: [
                  {
                    _index: '.ds-logs-entityanalytics_okta.user-default-2023.11.15-000001',
                    _id: 'Bnwi8osBcjOsowlA78aM',
                    _score: null,
                    fields: {
                      'elastic_agent.version': ['8.12.0'],
                      'event.category': ['iam'],
                      'entityanalytics_okta.user.type': [
                        {
                          id: 'otyf1r6hlGf9AXhZ95d6',
                        },
                      ],
                      'user.profile.last_name': ['Test Last Name'],
                      'asset.last_seen': ['2023-11-21T08:08:46.000Z'],
                      'user.profile.status': ['ACTIVE'],
                      'asset.status': ['ACTIVE'],
                      'asset.id': ['00ud9ohoh9ww644Px5d7'],
                      'user.account.status.deprovisioned': [false],
                      'agent.name': ['docker-fleet-agent'],
                      'user.account.status.locked_out': [false],
                      'event.agent_id_status': ['verified'],
                      'event.kind': ['asset'],
                      'user.profile.job_title': ['Unit Test Writer'],
                      'user.profile.first_name': ['User First Name'],
                      'user.id': ['00ud9ohoh9ww644Px5d7'],
                      'user.account.status.suspended': [false],
                      'input.type': ['entity-analytics'],
                      'entityanalytics_okta.user._links': [
                        {
                          self: {
                            href: 'https://dev-36006609.okta.com/api/v1/users/00ud9ohoh9ww644Px5d7',
                          },
                        },
                      ],
                      'data_stream.type': ['logs'],
                      'related.user': ['00ud9ohoh9ww644Px5d7', 'test@elastic.co', 'Test', 'User'],
                      tags: ['forwarded', 'entityanalytics_okta-user'],
                      'agent.id': ['ced095f0-df97-4bdc-86a9-25cc11238317'],
                      'ecs.version': ['8.11.0'],
                      'asset.last_updated': ['2023-11-21T08:14:56.000Z'],
                      'labels.identity_source': [
                        'entity-analytics-entityanalytics_okta.user-be940503-bec8-4849-8ec7-2b526d6f2609',
                      ],
                      'agent.version': ['8.12.0'],
                      _id: ['XoEiFowBcjOsowlAIN1T'],
                      'asset.category': ['entity'],
                      'user.account.status.recovery': [false],
                      _index: ['.ds-logs-entityanalytics_okta.user-default-2023.11.15-000001'],
                      'user.account.activated_date': ['2023-11-14T16:33:54.000Z'],
                      'asset.type': ['okta_user'],
                      'user.name': ['test@elastic.co'],
                      'asset.last_status_change_date': ['2023-11-15T07:09:05.000Z'],
                      'user.profile.mobile_phone': ['99999999'],
                      'user.geo.city_name': ['Adam'],
                      'agent.type': ['filebeat'],
                      'event.module': ['entityanalytics_okta'],
                      'user.email': ['test@elastic.co'],
                      'user.profile.primaryPhone': ['99999999'],
                      'elastic_agent.snapshot': [true],
                      'asset.create_date': ['2023-11-14T16:33:53.000Z'],
                      'elastic_agent.id': ['ced095f0-df97-4bdc-86a9-25cc11238317'],
                      'user.account.create_date': ['2023-11-14T16:33:53.000Z'],
                      'data_stream.namespace': ['default'],
                      'user.account.change_date': ['2023-11-15T07:09:05.000Z'],
                      'user.geo.country_iso_code': ['NL'],
                      'event.action': ['user-modified'],
                      'event.ingested': ['2023-11-28T13:33:04Z'],
                      '@timestamp': ['2023-11-28T13:32:54.446Z'],
                      'data_stream.dataset': ['entityanalytics_okta.user'],
                      'event.type': ['user', 'info'],
                      'agent.ephemeral_id': ['7ddc108f-026a-4a20-afc1-ebc983145df4'],
                      'user.account.status.password_expired': [false],
                      'user.account.password_change_date': ['2023-11-15T07:09:05.000Z'],
                      'event.dataset': ['entityanalytics_okta.user'],
                      'user.name.text': ['test@elastic.co'],
                    },
                    sort: [1700574447551],
                  },
                ],
              },
            },
          },
        ],
      },
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
