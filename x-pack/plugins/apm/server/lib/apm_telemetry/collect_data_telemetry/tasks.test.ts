/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmIndicesConfig } from '../../../routes/settings/apm_indices/get_apm_indices';
import { tasks } from './tasks';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/elasticsearch_fieldnames';

describe('data telemetry collection tasks', () => {
  const indices = {
    error: 'apm-8.0.0-error',
    metric: 'apm-8.0.0-metric',
    span: 'apm-8.0.0-span',
    transaction: 'apm-8.0.0-transaction',
  } as ApmIndicesConfig;

  describe('environments', () => {
    const task = tasks.find((t) => t.name === 'environments');

    it('returns environment information', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        aggregations: {
          environments: {
            buckets: [
              {
                key: 'production',
              },
              {
                key: 'testing',
              },
            ],
          },
          service_environments: {
            buckets: [
              {
                key: {
                  [SERVICE_NAME]: 'opbeans-node',
                  [SERVICE_ENVIRONMENT]: 'production',
                },
              },
              {
                key: {
                  [SERVICE_NAME]: 'opbeans-node',
                  [SERVICE_ENVIRONMENT]: null,
                },
              },
              {
                key: {
                  [SERVICE_NAME]: 'opbeans-java',
                  [SERVICE_ENVIRONMENT]: 'production',
                },
              },
              {
                key: {
                  [SERVICE_NAME]: 'opbeans-rum',
                  [SERVICE_ENVIRONMENT]: null,
                },
              },
            ],
          },
        },
      });

      expect(await task?.executor({ search, indices } as any)).toEqual({
        environments: {
          services_with_multiple_environments: 1,
          services_without_environment: 2,
          top_environments: ['production', 'testing'],
        },
      });
    });
  });

  describe('aggregated_transactions', () => {
    const task = tasks.find((t) => t.name === 'aggregated_transactions');

    describe('without transactions', () => {
      it('returns an empty result', async () => {
        const search = jest.fn().mockReturnValueOnce({
          hits: {
            hits: [],
            total: {
              value: 0,
            },
          },
        });

        expect(await task?.executor({ indices, search } as any)).toEqual({});
      });
    });

    it('returns aggregated transaction counts', async () => {
      const search = jest
        .fn()
        // The first call to `search` asks for a transaction to get
        // a fixed date range.
        .mockReturnValueOnce({
          hits: {
            hits: [{ _source: { '@timestamp': new Date().toISOString() } }],
          },
          total: {
            value: 1,
          },
        })
        // Later calls are all composite aggregations. We return 2 pages of
        // results to test if scrolling works.
        .mockImplementation((params) => {
          let arrayLength = 1000;
          let nextAfter: Record<string, any> = { after_key: {} };

          if (params.body.aggs.transaction_metric_groups.composite.after) {
            arrayLength = 250;
            nextAfter = {};
          }

          return Promise.resolve({
            hits: {
              total: {
                value: 5000,
              },
            },
            aggregations: {
              transaction_metric_groups: {
                buckets: new Array(arrayLength),
                ...nextAfter,
              },
            },
          });
        });

      expect(await task?.executor({ indices, search } as any)).toEqual({
        aggregated_transactions: {
          current_implementation: {
            expected_metric_document_count: 1250,
            transaction_count: 5000,
            ratio: 0.25,
          },
          no_observer_name: {
            expected_metric_document_count: 1250,
            transaction_count: 5000,
            ratio: 0.25,
          },
          with_country: {
            expected_metric_document_count: 1250,
            transaction_count: 5000,
            ratio: 0.25,
          },
        },
      });
    });
  });

  describe('cloud', () => {
    const task = tasks.find((t) => t.name === 'cloud');

    it('returns a map of cloud provider data', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        aggregations: {
          availability_zone: {
            buckets: [
              { doc_count: 1, key: 'us-west-1' },
              { doc_count: 1, key: 'europe-west1-c' },
            ],
          },
          provider: {
            buckets: [
              { doc_count: 1, key: 'aws' },
              { doc_count: 1, key: 'gcp' },
            ],
          },
          region: {
            buckets: [
              { doc_count: 1, key: 'us-west' },
              { doc_count: 1, key: 'europe-west1' },
            ],
          },
        },
      });

      expect(await task?.executor({ indices, search } as any)).toEqual({
        cloud: {
          availability_zone: ['us-west-1', 'europe-west1-c'],
          provider: ['aws', 'gcp'],
          region: ['us-west', 'europe-west1'],
        },
      });
    });

    describe('with no results', () => {
      it('returns an empty map', async () => {
        const search = jest.fn().mockResolvedValueOnce({});

        expect(await task?.executor({ indices, search } as any)).toEqual({
          cloud: {
            availability_zone: [],
            provider: [],
            region: [],
          },
        });
      });
    });
  });

  describe('host', () => {
    const task = tasks.find((t) => t.name === 'host');

    it('returns a map of host provider data', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        aggregations: {
          platform: {
            buckets: [
              { doc_count: 1, key: 'linux' },
              { doc_count: 1, key: 'windows' },
              { doc_count: 1, key: 'macos' },
            ],
          },
        },
      });

      expect(await task?.executor({ indices, search } as any)).toEqual({
        host: {
          os: { platform: ['linux', 'windows', 'macos'] },
        },
      });
    });

    describe('with no results', () => {
      it('returns an empty map', async () => {
        const search = jest.fn().mockResolvedValueOnce({});

        expect(await task?.executor({ indices, search } as any)).toEqual({
          host: {
            os: {
              platform: [],
            },
          },
        });
      });
    });
  });

  describe('processor_events', () => {
    const task = tasks.find((t) => t.name === 'processor_events');

    it('returns a map of processor events', async () => {
      const getTime = jest
        .spyOn(Date.prototype, 'getTime')
        .mockReturnValue(1594330792957);

      const search = jest.fn().mockImplementation((params: any) => {
        const isTotalHitsQuery = params?.body?.track_total_hits;

        return Promise.resolve(
          isTotalHitsQuery
            ? { hits: { total: { value: 1 } } }
            : {
                hits: {
                  hits: [{ _source: { '@timestamp': 1 } }],
                },
              }
        );
      });

      expect(await task?.executor({ indices, search } as any)).toEqual({
        counts: {
          error: {
            '1d': 1,
            all: 1,
          },
          metric: {
            '1d': 1,
            all: 1,
          },
          onboarding: {
            '1d': 1,
            all: 1,
          },
          sourcemap: {
            '1d': 1,
            all: 1,
          },
          span: {
            '1d': 1,
            all: 1,
          },
          transaction: {
            '1d': 1,
            all: 1,
          },
        },
        retainment: {
          error: {
            ms: 0,
          },
          metric: {
            ms: 0,
          },
          onboarding: {
            ms: 0,
          },
          sourcemap: {
            ms: 0,
          },
          span: {
            ms: 0,
          },
          transaction: {
            ms: 0,
          },
        },
      });

      getTime.mockRestore();
    });
  });

  describe('integrations', () => {
    const task = tasks.find((t) => t.name === 'integrations');

    it('returns the count of ML jobs', async () => {
      const transportRequest = jest
        .fn()
        .mockResolvedValueOnce({ body: { count: 1 } });

      expect(
        await task?.executor({ indices, transportRequest } as any)
      ).toEqual({
        integrations: {
          ml: {
            all_jobs_count: 1,
          },
        },
      });
    });

    describe('with no data', () => {
      it('returns a count of 0', async () => {
        const transportRequest = jest.fn().mockResolvedValueOnce({});

        expect(
          await task?.executor({ indices, transportRequest } as any)
        ).toEqual({
          integrations: {
            ml: {
              all_jobs_count: 0,
            },
          },
        });
      });
    });
  });

  describe('indices_stats', () => {
    const task = tasks.find((t) => t.name === 'indices_stats');

    it('returns a map of index stats', async () => {
      const indicesStats = jest.fn().mockResolvedValueOnce({
        _all: { total: { docs: { count: 1 }, store: { size_in_bytes: 1 } } },
        _shards: { total: 1 },
      });

      expect(await task?.executor({ indices, indicesStats } as any)).toEqual({
        indices: {
          shards: {
            total: 1,
          },
          all: {
            total: {
              docs: {
                count: 1,
              },
              store: {
                size_in_bytes: 1,
              },
            },
          },
        },
      });
    });

    describe('with no results', () => {
      it('returns zero values', async () => {
        const indicesStats = jest.fn().mockResolvedValueOnce({});

        expect(await task?.executor({ indices, indicesStats } as any)).toEqual({
          indices: {
            shards: {
              total: 0,
            },
            all: {
              total: {
                docs: {
                  count: 0,
                },
                store: {
                  size_in_bytes: 0,
                },
              },
            },
          },
        });
      });
    });
  });

  describe('cardinality', () => {
    const task = tasks.find((t) => t.name === 'cardinality');

    it('returns cardinalities', async () => {
      const search = jest.fn().mockImplementation((params: any) => {
        const isRumQuery = params.body.query.bool.filter.length === 2;
        if (isRumQuery) {
          return Promise.resolve({
            aggregations: {
              'client.geo.country_iso_code': { value: 5 },
              'transaction.name': { value: 1 },
              'user_agent.original': { value: 2 },
            },
          });
        } else {
          return Promise.resolve({
            aggregations: {
              'transaction.name': { value: 3 },
              'user_agent.original': { value: 4 },
            },
          });
        }
      });

      expect(await task?.executor({ search } as any)).toEqual({
        cardinality: {
          client: { geo: { country_iso_code: { rum: { '1d': 5 } } } },
          transaction: { name: { all_agents: { '1d': 3 }, rum: { '1d': 1 } } },
          user_agent: {
            original: { all_agents: { '1d': 4 }, rum: { '1d': 2 } },
          },
        },
      });
    });
  });
});
