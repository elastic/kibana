/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventOutcome } from '../../../../common/event_outcome';
import { getSeverity } from '../../../../common/anomaly_detection';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import {
  TRANSACTION_DURATION,
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  EVENT_OUTCOME,
} from '../../../../common/elasticsearch_fieldnames';
import { mergeProjection } from '../../../projections/util/merge_projection';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  ServicesItemsSetup,
  ServicesItemsProjection,
} from './get_services_items';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getMLJobIds,
  getServiceAnomalies,
} from '../../service_map/get_service_anomalies';
import { AggregationResultOf } from '../../../../typings/elasticsearch/aggregations';

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
}

export const getTransactionDurationAverages = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { apmEventClient, start, end } = setup;

  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              average: {
                avg: {
                  field: TRANSACTION_DURATION,
                },
              },
              timeseries: {
                date_histogram: getDateHistogramOpts(start, end),
                aggs: {
                  average: {
                    avg: {
                      field: TRANSACTION_DURATION,
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
      apm: {
        events: [
          ProcessorEvent.metric,
          ProcessorEvent.error,
          ProcessorEvent.transaction,
        ],
      },
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
}: AggregationParams) => {
  const { apmEventClient, start, end } = setup;
  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        size: 0,
        aggs: {
          services: {
            terms: {
              ...projection.body.aggs.services.terms,
              size: MAX_NUMBER_OF_SERVICES,
            },
            aggs: {
              timeseries: {
                date_histogram: getDateHistogramOpts(start, end),
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
    const transactionsPerMinute = serviceBucket.doc_count / deltaAsMinutes;
    return {
      serviceName: serviceBucket.key as string,
      transactionsPerMinute: {
        value: transactionsPerMinute,
        timeseries: serviceBucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key,
          y: dateBucket.doc_count / deltaAsMinutes,
        })),
      },
    };
  });
};

export const getTransactionErrorRates = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { apmEventClient, start, end } = setup;

  const outcomes = {
    terms: {
      field: EVENT_OUTCOME,
    },
  };

  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [ProcessorEvent.transaction],
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

  function calculateTransactionErrorPercentage(
    outcomeResponse: AggregationResultOf<typeof outcomes, {}>
  ) {
    const successfulTransactions =
      outcomeResponse.buckets.find(
        (bucket) => bucket.key === EventOutcome.success
      )?.doc_count ?? 0;
    const failedTransactions =
      outcomeResponse.buckets.find(
        (bucket) => bucket.key === EventOutcome.failure
      )?.doc_count ?? 0;

    return failedTransactions / (successfulTransactions + failedTransactions);
  }

  return aggregations.services.buckets.map((serviceBucket) => {
    const transactionErrorRate = calculateTransactionErrorPercentage(
      serviceBucket.outcomes
    );
    return {
      serviceName: serviceBucket.key as string,
      transactionErrorRate: {
        value: transactionErrorRate,
        timeseries: serviceBucket.timeseries.buckets.map((dateBucket) => {
          return {
            x: dateBucket.key,
            y: calculateTransactionErrorPercentage(dateBucket.outcomes),
          };
        }),
      },
    };
  });
};

export const getEnvironments = async ({
  setup,
  projection,
}: AggregationParams) => {
  const { apmEventClient } = setup;
  const response = await apmEventClient.search(
    mergeProjection(projection, {
      apm: {
        events: [
          ProcessorEvent.metric,
          ProcessorEvent.transaction,
          ProcessorEvent.error,
        ],
      },
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

    return {
      serviceName,
      severity,
    };
  });
};
