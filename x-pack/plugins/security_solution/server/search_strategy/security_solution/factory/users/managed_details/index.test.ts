/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.managed_user_details.dsl';
import { managedUserDetails } from '.';
import type { EntraManagedUser } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import type { IEsSearchResponse } from '@kbn/data-plugin/public';
import type { ManagedUserDetailsRequestOptionsInput } from '../../../../../../common/api/search_strategy';
import { UsersQueries } from '../../../../../../common/api/search_strategy';

export const mockOptions: ManagedUserDetailsRequestOptionsInput = {
  defaultIndex: ['logs-*'],
  userName: 'test-user-name',
  factoryQueryType: UsersQueries.managedDetails,
};

export const mockSearchStrategyResponse: IEsSearchResponse<EntraManagedUser> = {
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
                    _source: {
                      agent: {
                        name: 'docker-fleet-agent',
                        id: 'ced095f0-df97-4bdc-86a9-25cc11238317',
                        type: 'filebeat',
                        ephemeral_id: '8c548786-ae4d-4bd3-acda-8cdc4f68bb21',
                        version: '8.12.0',
                      },
                      elastic_agent: {
                        id: 'ced095f0-df97-4bdc-86a9-25cc11238317',
                        version: '8.12.0',
                        snapshot: true,
                      },
                      entityanalytics_okta: {
                        user: {
                          _links: {
                            self: {
                              href: 'https://dev-36006609.okta.com/api/v1/users/00ud9ohoh9ww644Px5d7',
                            },
                          },
                          type: {
                            id: 'otyf1r6hlGf9AXhZ95d6',
                          },
                        },
                      },
                      tags: ['forwarded', 'entityanalytics_okta-user'],
                      labels: {
                        identity_source:
                          'entity-analytics-entityanalytics_okta.user-be940503-bec8-4849-8ec7-2b526d6f2609',
                      },
                      input: {
                        type: 'entity-analytics',
                      },
                      '@timestamp': '2023-11-21T13:47:27.551Z',
                      ecs: {
                        version: '8.11.0',
                      },
                      related: {
                        user: ['00ud9ohoh9ww644Px5d7', 'test.user@elastic.co', 'Test', 'User'],
                      },
                      data_stream: {
                        namespace: 'default',
                        type: 'logs',
                        dataset: 'entityanalytics_okta.user',
                      },
                      event: {
                        agent_id_status: 'verified',
                        ingested: '2023-11-21T13:47:37Z',
                        kind: 'asset',
                        action: 'user-modified',
                        category: ['iam'],
                        type: ['user', 'info'],
                        dataset: 'entityanalytics_okta.user',
                      },
                      asset: {
                        last_updated: '2023-11-21T08:14:56.000Z',
                        last_seen: '2023-11-21T08:08:46.000Z',
                        last_status_change_date: '2023-11-15T07:09:05.000Z',
                        id: '00ud9ohoh9ww644Px5d7',
                        category: 'entity',
                        type: 'okta_user',
                        create_date: '2023-11-14T16:33:53.000Z',
                        status: 'ACTIVE',
                      },
                      user: {
                        geo: {
                          city_name: 'Adam',
                          country_iso_code: 'NL',
                        },
                        profile: {
                          primaryPhone: '0645130498',
                          mobile_phone: '0645130499',
                          last_name: 'User',
                          first_name: 'Test',
                          job_title: 'Intern',
                          status: 'ACTIVE',
                        },
                        name: 'test@elastic.co',
                        id: '00ud9ohoh9ww644Px5d7',
                        account: {
                          change_date: '2023-11-15T07:09:05.000Z',
                          password_change_date: '2023-11-15T07:09:05.000Z',
                          activated_date: '2023-11-14T16:33:54.000Z',
                          create_date: '2023-11-14T16:33:53.000Z',
                          status: {
                            password_expired: false,
                            deprovisioned: false,
                            locked_out: false,
                            recovery: false,
                            suspended: false,
                          },
                        },
                        email: 'test@elastic.co',
                      },
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
