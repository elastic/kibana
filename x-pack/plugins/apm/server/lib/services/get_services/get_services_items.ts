/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { uniq } from 'lodash';
import { mergeProjection } from '../../../../common/projections/util/merge_projection';
import {
  PROCESSOR_EVENT,
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM
} from '../../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
  SetupHasTransactionDurationMetrics
} from '../../helpers/setup_request';
import { getServicesProjection } from '../../../../common/projections/services';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;

const arrayUnionToCallable = <T extends any[]>(
  array: T
): Array<ValuesType<T>> => {
  return array;
};

type ServicesItemsSetup = Setup &
  SetupTimeRange &
  SetupUIFilters &
  SetupHasTransactionDurationMetrics;

type ServicesItemsProjection = ReturnType<typeof getServicesProjection>;

interface AggregationParams {
  setup: ServicesItemsSetup;
  projection: ServicesItemsProjection;
}

const getTransactionDurationAvg = async ({
  setup,
  projection
}: AggregationParams) => {
  const { client } = setup;

  const response = await client.search(
    mergeProjection(projection, {
      size: 0,
      body: {
        query: {
          bool: {
            filter: projection.body.query.bool.filter.concat({
              term: {
                [PROCESSOR_EVENT]: setup.hasTransactionDurationMetrics
                  ? 'metric'
                  : 'transaction'
              }
            })
          }
        },
        aggs: {
          services: {
            ...projection.body.aggs.services,
            aggs: {
              average: {
                avg: {
                  field: setup.hasTransactionDurationMetrics
                    ? TRANSACTION_DURATION_HISTOGRAM
                    : TRANSACTION_DURATION
                }
              }
            }
          }
        }
      }
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map(bucket => ({
    name: bucket.key as string,
    value: bucket.average.value
  }));
};

const getAgentName = async ({ setup, projection }: AggregationParams) => {
  const response = await setup.client.search(
    mergeProjection(projection, {
      body: {
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              {
                terms: {
                  [PROCESSOR_EVENT]: setup.hasTransactionDurationMetrics
                    ? ['metric', 'error']
                    : ['metric', 'error', 'transaction']
                }
              }
            ]
          }
        },
        aggs: {
          services: {
            ...projection.body.aggs.services,
            aggs: {
              agent_name: {
                top_hits: {
                  _source: [AGENT_NAME],
                  size: 1
                }
              }
            }
          }
        },
        size: 0
      }
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map(bucket => ({
    name: bucket.key as string,
    value: (bucket.agent_name.hits.hits[0]?._source as {
      agent: {
        name: string;
      };
    }).agent.name
  }));
};

const getTransactionRate = async ({ setup, projection }: AggregationParams) => {
  const response = await setup.client.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              {
                term: {
                  [PROCESSOR_EVENT]: setup.hasTransactionDurationMetrics
                    ? 'metric'
                    : 'transaction'
                }
              }
            ]
          }
        },
        aggs: setup.hasTransactionDurationMetrics
          ? {
              services: {
                ...projection.body.aggs.services,
                aggs: {
                  count: {
                    value_count: {
                      field: TRANSACTION_DURATION_HISTOGRAM
                    }
                  }
                }
              }
            }
          : projection.body.aggs
      }
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  const deltaAsMinutes = (setup.end - setup.start) / 1000 / 60;

  return arrayUnionToCallable(aggregations.services.buckets).map(bucket => {
    const count =
      ('count' in bucket ? bucket.count.value : bucket.doc_count) ?? 0;
    const transactionsPerMinute = count / deltaAsMinutes;
    return {
      name: bucket.key as string,
      value: transactionsPerMinute
    };
  });
};

const getErrorRate = async ({ setup, projection }: AggregationParams) => {
  const response = await setup.client.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              {
                term: {
                  [PROCESSOR_EVENT]: 'error'
                }
              }
            ]
          }
        }
      }
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  const deltaAsMinutes = (setup.end - setup.start) / 1000 / 60;

  return aggregations.services.buckets.map(bucket => {
    const transactionsPerMinute = bucket.doc_count / deltaAsMinutes;
    return {
      name: bucket.key as string,
      value: transactionsPerMinute
    };
  });
};

const getEnvironments = async ({ setup, projection }: AggregationParams) => {
  const response = await setup.client.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              {
                terms: {
                  [PROCESSOR_EVENT]: setup.hasTransactionDurationMetrics
                    ? ['error', 'metric']
                    : ['transaction', 'error', 'metric']
                }
              }
            ]
          }
        },
        aggs: {
          services: {
            ...projection.body.aggs.services,
            aggs: {
              environments: {
                terms: {
                  field: SERVICE_ENVIRONMENT
                }
              }
            }
          }
        }
      }
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map(bucket => ({
    name: bucket.key as string,
    value: bucket.environments.buckets.map(env => env.key as string)
  }));
};

export async function getServicesItems(setup: ServicesItemsSetup) {
  const projection = getServicesProjection({ setup });

  const params = {
    setup,
    projection
  };

  const [
    transactionDurationAvg,
    agentName,
    transactionRate,
    errorRate,
    environments
  ] = await Promise.all([
    getTransactionDurationAvg(params),
    getAgentName(params),
    getTransactionRate(params),
    getErrorRate(params),
    getEnvironments(params)
  ]);

  const allMetrics = [
    transactionDurationAvg,
    agentName,
    transactionRate,
    errorRate,
    environments
  ];

  const serviceNames = uniq(
    arrayUnionToCallable(
      allMetrics.flatMap(metric =>
        arrayUnionToCallable(metric).map(service => service.name)
      )
    )
  );

  const items = serviceNames.map(serviceName => {
    return {
      serviceName,
      agentName:
        agentName.find(service => service.name === serviceName)?.value ?? null,
      transactionsPerMinute:
        transactionRate.find(service => service.name === serviceName)?.value ??
        null,
      errorsPerMinute:
        errorRate.find(service => service.name === serviceName)?.value ?? null,
      avgResponseTime:
        transactionDurationAvg.find(service => service.name === serviceName)
          ?.value ?? null,
      environments:
        environments.find(service => service.name === serviceName)?.value ?? []
    };
  });

  return items;
}
