/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { tasks } from './tasks';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../common/es_fields/apm';
import { IndicesStatsResponse } from '../telemetry_client';

describe('data telemetry collection tasks', () => {
  const indices = {
    error: 'apm-8.0.0-error',
    metric: 'apm-8.0.0-metric',
    span: 'apm-8.0.0-span',
    transaction: 'apm-8.0.0-transaction',
  } as APMIndices;

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

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
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

        expect(
          await task?.executor({ indices, telemetryClient: { search } } as any)
        ).toEqual({});
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

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
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

  describe('global_labels', () => {
    const task = tasks.find((t) => t.name === 'global_labels');

    it('returns count of global labels when present', async () => {
      const fieldCaps = jest.fn().mockResolvedValue({
        indices: [
          '.ds-metrics-apm.service_destination.1m-default-2023.09.26-000005',
          '.ds-metrics-apm.service_summary.1m-default-2023.09.26-000005',
          '.ds-metrics-apm.service_transaction.1m-default-2023.09.26-000005',
          '.ds-metrics-apm.transaction.1m-default-2023.09.26-000005',
        ],
        fields: {
          'labels.telemetry_auto_version': {
            keyword: {
              type: 'keyword',
              metadata_field: false,
              searchable: true,
              aggregatable: true,
            },
          },
          labels: {
            object: {
              type: 'object',
              metadata_field: false,
              searchable: false,
              aggregatable: false,
            },
          },
        },
      });

      expect(
        await task?.executor({ indices, telemetryClient: { fieldCaps } } as any)
      ).toEqual({
        counts: {
          global_labels: {
            '1d': 1,
          },
        },
      });
    });

    it('returns 0 count of global labels when not present', async () => {
      const fieldCaps = jest.fn().mockResolvedValue({
        indices: [],
        fields: {},
      });

      expect(
        await task?.executor({ indices, telemetryClient: { fieldCaps } } as any)
      ).toEqual({
        counts: {
          global_labels: {
            '1d': 0,
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

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
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

        expect(
          await task?.executor({ indices, telemetryClient: { search } } as any)
        ).toEqual({
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

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
        host: {
          os: { platform: ['linux', 'windows', 'macos'] },
        },
      });
    });

    describe('with no results', () => {
      it('returns an empty map', async () => {
        const search = jest.fn().mockResolvedValueOnce({});

        expect(
          await task?.executor({ indices, telemetryClient: { search } } as any)
        ).toEqual({
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

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
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
        await task?.executor({
          indices,
          telemetryClient: { transportRequest },
        } as any)
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
          await task?.executor({
            indices,
            telemetryClient: { transportRequest },
          } as any)
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
      const indicesStatsResponse: IndicesStatsResponse = {
        _shards: {
          total: 2,
        },
        _all: {
          total: {
            store: {
              size_in_bytes: 100,
            },
            docs: {
              count: 2,
            },
          },
          primaries: {
            docs: {
              count: 1,
            },
            store: {
              size_in_bytes: 50,
              total_data_set_size_in_bytes: 50,
            },
          },
        },
      };

      const searchResponse = {
        aggregations: {
          metricsets: {
            buckets: [
              {
                key: 'service_transaction',
                doc_count: 3240,
                rollup_interval: {
                  buckets: [
                    {
                      key: '10m',
                      doc_count: 1080,
                      metrics_value_count: {
                        value: 6,
                      },
                    },
                    {
                      key: '1m',
                      doc_count: 1080,
                      metrics_value_count: {
                        value: 6,
                      },
                    },
                    {
                      key: '60m',
                      doc_count: 1080,
                      metrics_value_count: {
                        value: 6,
                      },
                    },
                  ],
                },
              },
              {
                key: 'transaction',
                doc_count: 3240,
                rollup_interval: {
                  buckets: [
                    {
                      key: '10m',
                      doc_count: 1080,
                      metrics_value_count: {
                        value: 6,
                      },
                    },
                    {
                      key: '1m',
                      doc_count: 1080,
                      metrics_value_count: {
                        value: 6,
                      },
                    },
                    {
                      key: '60m',
                      doc_count: 1080,
                      metrics_value_count: {
                        value: 6,
                      },
                    },
                  ],
                },
              },
              {
                key: 'service_destination',
                doc_count: 1620,
                rollup_interval: {
                  buckets: [
                    {
                      key: '10m',
                      doc_count: 540,
                      metrics_value_count: {
                        value: 3,
                      },
                    },
                    {
                      key: '1m',
                      doc_count: 540,
                      metrics_value_count: {
                        value: 3,
                      },
                    },
                    {
                      key: '60m',
                      doc_count: 540,
                      metrics_value_count: {
                        value: 3,
                      },
                    },
                  ],
                },
              },
              {
                key: 'service_summary',
                doc_count: 30,
                rollup_interval: {
                  buckets: [
                    {
                      key: '1m',
                      doc_count: 12,
                      metrics_value_count: {
                        value: 12,
                      },
                    },
                    {
                      key: '10m',
                      doc_count: 9,
                      metrics_value_count: {
                        value: 9,
                      },
                    },
                    {
                      key: '60m',
                      doc_count: 9,
                      metrics_value_count: {
                        value: 9,
                      },
                    },
                  ],
                },
              },
              {
                key: 'span_breakdown',
                doc_count: 12,
                rollup_interval: {
                  buckets: [],
                },
              },
              {
                key: 'app',
                doc_count: 6,
                rollup_interval: {
                  buckets: [],
                },
              },
            ],
          },
        },
      };

      const indicesStats = jest.fn().mockResolvedValue(indicesStatsResponse);
      const search = jest.fn().mockResolvedValue(searchResponse);

      expect(
        await task?.executor({
          indices,
          telemetryClient: {
            indicesStats,
            search,
          },
        } as any)
      ).toMatchSnapshot();
    });
    it('with no results', async () => {
      const indicesStatsResponse: IndicesStatsResponse = {
        _shards: {
          total: 0,
        },
        _all: {
          total: {
            store: {
              size_in_bytes: 0,
            },
            docs: {
              count: 0,
            },
          },
          primaries: {
            docs: {
              count: 0,
            },
            store: {
              size_in_bytes: 0,
              total_data_set_size_in_bytes: 0,
            },
          },
        },
      };

      const searchResponse = {};

      const indicesStats = jest.fn().mockResolvedValue(indicesStatsResponse);
      const search = jest.fn().mockResolvedValue(searchResponse);

      expect(
        await task?.executor({
          indices,
          telemetryClient: {
            indicesStats,
            search,
          },
        } as any)
      ).toMatchSnapshot();
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

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
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

  describe('service groups', () => {
    const task = tasks.find((t) => t.name === 'service_groups');
    const savedObjectsClient = savedObjectsClientMock.create();

    it('returns service group stats', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        page: 1,
        per_page: 500,
        total: 2,
        saved_objects: [
          {
            type: 'apm-service-group',
            id: '0b6157f0-44bd-11ed-bdb7-bffab551cd4d',
            namespaces: ['default'],
            attributes: {
              color: '#5094C4',
              kuery: 'service.environment: production',
              groupName: 'production',
            },
            references: [],
            score: 1,
          },
          {
            type: 'apm-service-group',
            id: '0b6157f0-44bd-11ed-bdb7-bffab551cd4d',
            namespaces: ['space-1'],
            attributes: {
              color: '#5094C4',
              kuery: 'agent.name: go',
              groupName: 'agent',
            },
            references: [],
            score: 0,
          },
        ],
      });

      expect(
        await task?.executor({
          savedObjectsClient,
        } as any)
      ).toEqual({
        service_groups: {
          kuery_fields: ['service.environment', 'agent.name'],
          total: 2,
        },
      });
    });

    it('should return stats from all spaces', () => {
      expect(savedObjectsClient.find).toHaveBeenCalledWith({
        type: 'apm-service-group',
        page: 1,
        perPage: 500,
        sortField: 'updated_at',
        sortOrder: 'desc',
        namespaces: ['*'],
      });
    });

    it('returns unique fields', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        page: 1,
        per_page: 500,
        total: 2,
        saved_objects: [
          {
            type: 'apm-service-group',
            id: '0b6157f0-44bd-11ed-bdb7-bffab551cd4d',
            namespaces: ['default'],
            attributes: {
              color: '#5094C4',
              kuery: 'service.environment: production',
              groupName: 'production',
            },
            references: [],
            score: 1,
          },
          {
            type: 'apm-service-group',
            id: '0b6157f0-44bd-11ed-bdb7-bffab551cd4d',
            namespaces: ['default'],
            attributes: {
              color: '#5094C4',
              kuery: 'service.environment: production and agent.name: go',
              groupName: 'agent',
            },
            references: [],
            score: 0,
          },
        ],
      });

      expect(
        await task?.executor({
          savedObjectsClient,
        } as any)
      ).toEqual({
        service_groups: {
          kuery_fields: ['service.environment', 'agent.name'],
          total: 2,
        },
      });
    });
  });

  describe('custom dashboards', () => {
    const task = tasks.find((t) => t.name === 'custom_dashboards');
    const savedObjectsClient = savedObjectsClientMock.create();

    it('returns custom dashboards stats from all spaces', async () => {
      savedObjectsClient.find.mockResolvedValueOnce({
        page: 1,
        per_page: 500,
        total: 2,
        saved_objects: [
          {
            type: 'apm-custom-dashboards',
            id: '0b6157f0-44bd-11ed-bdb7-bffab551cd4d',
            namespaces: ['default'],
            attributes: {
              dashboardSavedObjectId: 'foo-id',
              serviceEnvironmentFilterEnabled: true,
              serviceNameFilterEnabled: true,
              kuery: 'service.name: frontend and service.environment: prod',
            },
            references: [],
            score: 1,
          },
          {
            type: 'apm-custom-dashboards',
            id: '0b6157f0-44bd-11ed-bdb7-bffab551cd4d',
            namespaces: ['space-1'],
            attributes: {
              dashboardSavedObjectId: 'bar-id',
              serviceEnvironmentFilterEnabled: true,
              serviceNameFilterEnabled: true,
              kuery: 'service.name: frontend',
            },
            references: [],
            score: 0,
          },
        ],
      });

      expect(
        await task?.executor({
          savedObjectsClient,
        } as any)
      ).toEqual({
        custom_dashboards: {
          kuery_fields: ['service.name', 'service.environment'],
          total: 2,
        },
      });
    });
  });

  describe('top_traces', () => {
    const task = tasks.find((t) => t.name === 'top_traces');

    it('returns max and median number of documents in top traces', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        aggregations: {
          top_traces: {
            buckets: [
              {
                key: '521485',
                doc_count: 1026,
              },
              {
                key: '594439',
                doc_count: 1025,
              },
              {
                key: '070251',
                doc_count: 1023,
              },
              {
                key: '108079',
                doc_count: 1023,
              },
              {
                key: '118887',
                doc_count: 1023,
              },
            ],
          },
          max: {
            value: 1026,
          },
          median: {
            values: {
              '50.0': 1023,
            },
          },
        },
      });

      expect(
        await task?.executor({ indices, telemetryClient: { search } } as any)
      ).toEqual({
        top_traces: {
          max: 1026,
          median: 1023,
        },
      });
    });
  });
});
