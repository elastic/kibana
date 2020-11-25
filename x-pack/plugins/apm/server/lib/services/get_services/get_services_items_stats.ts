/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceHealthStatus } from '../../../../common/service_health_status';
import { EventOutcome } from '../../../../common/event_outcome';
import { getSeverity } from '../../../../common/anomaly_detection';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  EVENT_OUTCOME,
} from '../../../../common/elasticsearch_fieldnames';
import { mergeProjection } from '../../../projections/util/merge_projection';
import {
  ServicesItemsSetup,
  ServicesItemsProjection,
} from './get_services_items';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getMLJobIds,
  getServiceAnomalies,
} from '../../service_map/get_service_anomalies';
import {
  calculateTransactionErrorPercentage,
  getOutcomeAggregation,
  getTransactionErrorRateTimeSeries,
} from '../../helpers/transaction_error_rate';

function getDateHistogramOpts(start: number, end: number) {
  return {
    field: '@timestamp',
    fixed_interval: getBucketSize(start, end, 20).intervalString,
    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  };
}

const MAX_NUMBER_OF_SERVICES = 500;

const getDeltaAsMinutes = (setup: ServicesItemsSetup) =>
  (setup.end - setup.start) / 1000 / 60;

interface AggregationParams {
  setup: ServicesItemsSetup;
  projection: ServicesItemsProjection;
  searchAggregatedTransactions: boolean;
}

export const getTransactionDurationAverages = async ({
  setup,
  projection,
  searchAggregatedTransactions,
}: AggregationParams) => {
  const { apmEventClient, start, end } = setup;

  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              ...getDocumentTypeFilterForAggregatedTransactions(
                searchAggregatedTransactions
              ),
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              average: {
                avg: {
                  field: getTransactionDurationFieldForAggregatedTransactions(
                    searchAggregatedTransactions
                  ),
                },
              },
              timeseries: {
                date_histogram: getDateHistogramOpts(start, end),
                aggs: {
                  average: {
                    avg: {
                      field: getTransactionDurationFieldForAggregatedTransactions(
                        searchAggregatedTransactions
                      ),
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((serviceBucket) => ({
    serviceName: serviceBucket.key as string,
    avgResponseTime: {
      value: serviceBucket.average.value,
      timeseries: serviceBucket.timeseries.buckets.map((dateBucket) => ({
        x: dateBucket.key,
        y: dateBucket.average.value,
      })),
    },
  }));
};

export const getAgentNames = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { apmEventClient } = setup;
  const response = await apmEventClient.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              agent_name: {
                top_hits: {
                  _source: [AGENT_NAME],
                  size: 1,
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((serviceBucket) => ({
    serviceName: serviceBucket.key as string,
    agentName: serviceBucket.agent_name.hits.hits[0]?._source.agent
      .name as AgentName,
  }));
};

export const getTransactionRates = async ({
  setup,
  projection,
  searchAggregatedTransactions,
}: AggregationParams) => {
  const { apmEventClient, start, end } = setup;
  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              ...getDocumentTypeFilterForAggregatedTransactions(
                searchAggregatedTransactions
              ),
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              count: {
                value_count: {
                  field: getTransactionDurationFieldForAggregatedTransactions(
                    searchAggregatedTransactions
                  ),
                },
              },
              timeseries: {
                date_histogram: getDateHistogramOpts(start, end),
                aggs: {
                  count: {
                    value_count: {
                      field: getTransactionDurationFieldForAggregatedTransactions(
                        searchAggregatedTransactions
                      ),
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  const deltaAsMinutes = getDeltaAsMinutes(setup);

  return aggregations.services.buckets.map((serviceBucket) => {
    const transactionsPerMinute = serviceBucket.count.value / deltaAsMinutes;
    return {
      serviceName: serviceBucket.key as string,
      transactionsPerMinute: {
        value: transactionsPerMinute,
        timeseries: serviceBucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key,
          y: dateBucket.count.value / deltaAsMinutes,
        })),
      },
    };
  });
};

export const getTransactionErrorRates = async ({
  setup,
  projection,
  searchAggregatedTransactions,
}: AggregationParams) => {
  const { apmEventClient, start, end } = setup;

  const outcomes = getOutcomeAggregation({ searchAggregatedTransactions });

  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...projection.body.query.bool.filter,
              {
                terms: {
                  [EVENT_OUTCOME]: [EventOutcome.failure, EventOutcome.success],
                },
              },
            ],
          },
        },
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              outcomes,
              timeseries: {
                date_histogram: getDateHistogramOpts(start, end),
                aggs: {
                  outcomes,
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((serviceBucket) => {
    const transactionErrorRate = calculateTransactionErrorPercentage(
      serviceBucket.outcomes
    );
    return {
      serviceName: serviceBucket.key as string,
      transactionErrorRate: {
        value: transactionErrorRate,
        timeseries: getTransactionErrorRateTimeSeries(
          serviceBucket.timeseries.buckets
        ),
      },
    };
  });
};

export const getEnvironments = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { apmEventClient, config } = setup;
  const maxServiceEnvironments = config['xpack.apm.maxServiceEnvironments'];
  const response = await apmEventClient.search(
    mergeProjection(projection, {
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              environments: {
                terms: {
                  field: SERVICE_ENVIRONMENT,
                  size: maxServiceEnvironments,
                },
              },
            },
          },
        },
      },
    })
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.services.buckets.map((serviceBucket) => ({
    serviceName: serviceBucket.key as string,
    environments: serviceBucket.environments.buckets.map(
      (envBucket) => envBucket.key as string
    ),
  }));
};

export const getHealthStatuses = async (
  { setup }: AggregationParams,
  mlAnomaliesEnvironment?: string
) => {
  if (!setup.ml) {
    return [];
  }

  const jobIds = await getMLJobIds(
    setup.ml.anomalyDetectors,
    mlAnomaliesEnvironment
  );
  if (!jobIds.length) {
    return [];
  }

  const anomalies = await getServiceAnomalies({
    setup,
    environment: mlAnomaliesEnvironment,
  });

  return Object.keys(anomalies.serviceAnomalies).map((serviceName) => {
    const stats = anomalies.serviceAnomalies[serviceName];

    const severity = getSeverity(stats.anomalyScore);
    const healthStatus = getServiceHealthStatus({ severity });

    return {
      serviceName,
      healthStatus,
    };
  });
};
