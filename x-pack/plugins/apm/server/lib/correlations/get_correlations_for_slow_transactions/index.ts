/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationOptionsByType } from '../../../../../../typings/elasticsearch/aggregations';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { environmentQuery, rangeQuery } from '../../../../common/utils/queries';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getDurationForPercentile } from './get_duration_for_percentile';
import { processSignificantTermAggs } from '../process_significant_term_aggs';
import { getLatencyDistribution } from './get_latency_distribution';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function getCorrelationsForSlowTransactions({
  environment,
  serviceName,
  transactionType,
  transactionName,
  durationPercentile,
  fieldNames,
  setup,
}: {
  environment?: string;
  serviceName: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
  durationPercentile: number;
  fieldNames: string[];
  setup: Setup & SetupTimeRange;
}) {
  return withApmSpan('get_correlations_for_slow_transactions', async () => {
    const { start, end, esFilter, apmEventClient } = setup;

    const backgroundFilters: ESFilter[] = [
      { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...esFilter,
    ];

    if (serviceName) {
      backgroundFilters.push({ term: { [SERVICE_NAME]: serviceName } });
    }

    if (transactionType) {
      backgroundFilters.push({ term: { [TRANSACTION_TYPE]: transactionType } });
    }

    if (transactionName) {
      backgroundFilters.push({ term: { [TRANSACTION_NAME]: transactionName } });
    }

    const durationForPercentile = await getDurationForPercentile({
      durationPercentile,
      backgroundFilters,
      setup,
    });

    const response = await withApmSpan('get_significant_terms', () => {
      const params = {
        apm: { events: [ProcessorEvent.transaction] },
        body: {
          size: 0,
          query: {
            bool: {
              // foreground filters
              filter: backgroundFilters,
              must: {
                function_score: {
                  query: {
                    range: {
                      [TRANSACTION_DURATION]: { gte: durationForPercentile },
                    },
                  },
                  script_score: {
                    script: {
                      source: `Math.log(2 + doc['${TRANSACTION_DURATION}'].value)`,
                    },
                  },
                },
              },
            },
          },
          aggs: fieldNames.reduce((acc, fieldName) => {
            return {
              ...acc,
              [fieldName]: {
                significant_terms: {
                  size: 10,
                  field: fieldName,
                  background_filter: {
                    bool: {
                      filter: [
                        ...backgroundFilters,
                        {
                          range: {
                            [TRANSACTION_DURATION]: {
                              lt: durationForPercentile,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            };
          }, {} as Record<string, { significant_terms: AggregationOptionsByType['significant_terms'] }>),
        },
      };
      return apmEventClient.search(params);
    });
    if (!response.aggregations) {
      return {};
    }

    const topSigTerms = processSignificantTermAggs({
      sigTermAggs: response.aggregations,
    });

    return getLatencyDistribution({
      setup,
      backgroundFilters,
      topSigTerms,
    });
  });
}
