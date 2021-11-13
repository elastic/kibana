/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { Environment } from '../../../common/environment_rt';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { request } from '../request';

export async function serviceInventory({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const [, , , services] = await Promise.all([
    request({
      endpoint: 'GET /internal/apm/environments',
      params: {
        query: {
          start,
          end,
        },
      },
    }),
    Promise.resolve(),
    // request({
    //   endpoint: 'GET /internal/apm/data_view/dynamic',
    // }),
    request({
      endpoint: 'GET /internal/apm/fallback_to_transactions',
      params: {
        query: {
          start,
          end,
          kuery: '',
        },
      },
    }),
    request({
      endpoint: 'GET /internal/apm/services',
      params: {
        query: {
          start,
          end,
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
        },
      },
    }).then(async (response) => {
      await request({
        endpoint: 'GET /internal/apm/services/detailed_statistics',
        params: {
          query: {
            start,
            end,
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
            serviceNames: JSON.stringify(
              response.items.map((item) => item.serviceName)
            ),
          },
        },
      });

      return response.items;
    }),
  ]);

  return {
    services,
  };
}

export async function serviceOverview({
  start,
  end,
  serviceName,
  transactionType,
  offset,
  latencyAggregationType,
  environment,
  kuery,
}: {
  start: string;
  end: string;
  serviceName: string;
  transactionType?: string;
  offset?: string;
  latencyAggregationType: LatencyAggregationType;
  environment: Environment;
  kuery: string;
}) {
  let comparisonStart: string | undefined;
  let comparisonEnd: string | undefined;

  if (offset) {
    const [, value, unit] = offset.match(/(.*?)(m|h|d|w)/) as [
      string,
      string,
      any
    ];

    comparisonStart = moment(start).subtract(unit, Number(value)).toISOString();
    comparisonEnd = moment(end).subtract(unit, Number(value)).toISOString();
  }

  await Promise.all([
    // request({
    //   endpoint: 'POST /internal/apm/data_view/static',
    // }),
    // request({
    //   endpoint: 'GET /internal/apm/has_data',
    // }),
    request({
      endpoint: 'GET /internal/apm/services/{serviceName}/agent',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
        },
      },
    }),
    request({
      endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
        },
      },
    }),
    ...(transactionType
      ? [
          request({
            endpoint: 'GET /internal/apm/services/{serviceName}/alerts',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                environment,
              },
            },
          }),
          request({
            endpoint:
              'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                latencyAggregationType,
                comparisonStart,
                comparisonEnd,
                environment,
                kuery,
              },
            },
          }),
          request({
            endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                comparisonStart,
                comparisonEnd,
                environment,
                kuery,
              },
            },
          }),
          request({
            endpoint:
              'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                latencyAggregationType,
                environment,
                kuery,
              },
            },
          }).then((response) =>
            request({
              endpoint:
                'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
              params: {
                path: {
                  serviceName,
                },
                query: {
                  start,
                  end,
                  environment,
                  kuery,
                  numBuckets: 20,
                  transactionType,
                  latencyAggregationType,
                  transactionNames: JSON.stringify(
                    response.transactionGroups.map((group) => group.name)
                  ),
                },
              },
            })
          ),
          request({
            endpoint:
              'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                comparisonStart,
                comparisonEnd,
                environment,
                kuery,
              },
            },
          }),
          request({
            endpoint:
              'GET /internal/apm/services/{serviceName}/error_groups/main_statistics',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                environment,
                kuery,
              },
            },
          }),
          request({
            endpoint:
              'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                transactionType,
                environment,
                kuery,
              },
            },
          }),
          request({
            endpoint:
              'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
            params: {
              path: {
                serviceName,
              },
              query: {
                start,
                end,
                comparisonStart,
                comparisonEnd,
                kuery,
                transactionType,
                environment,
                latencyAggregationType,
              },
            },
          }).then((response) => {
            return request({
              endpoint:
                'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
              params: {
                path: {
                  serviceName,
                },
                query: {
                  start,
                  end,
                  comparisonStart,
                  comparisonEnd,
                  kuery,
                  transactionType,
                  environment,
                  latencyAggregationType,
                  numBuckets: 20,
                  serviceNodeIds: JSON.stringify(
                    response.currentPeriod.map((item) => item.serviceNodeName)
                  ),
                },
              },
            });
          }),
        ]
      : ([] as any)),
    request({
      endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
    }),
    request({
      endpoint: 'GET /internal/apm/services/{serviceName}/metadata/icons',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
        },
      },
    }),
    request({
      endpoint: 'GET /internal/apm/environments',
      params: {
        query: {
          start,
          end,
          serviceName,
        },
      },
    }),
    // request({
    //   endpoint: 'GET /internal/apm/data_view/dynamic',
    // }),
    request({
      endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
      params: {
        path: {
          serviceName,
        },
        query: {
          start,
          end,
          offset,
          numBuckets: 20,
          environment,
        },
      },
    }),
    request({
      endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
      params: {
        path: {
          serviceName,
        },
        query: {
          environment,
          start,
          end,
        },
      },
    }),
    request({
      endpoint: 'GET /internal/apm/fallback_to_transactions',
      params: {
        query: {
          kuery,
          start,
          end,
        },
      },
    }),
  ]);
}
