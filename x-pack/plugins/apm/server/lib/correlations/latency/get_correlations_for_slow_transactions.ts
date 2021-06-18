/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationOptionsByType } from '../../../../../../../typings/elasticsearch';
import { TRANSACTION_DURATION } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { getDurationForPercentile } from './get_duration_for_percentile';
import { processSignificantTermAggs } from '../process_significant_term_aggs';
import { getLatencyDistribution } from './get_latency_distribution';
import { withApmSpan } from '../../../utils/with_apm_span';
import { CorrelationsOptions, getCorrelationsFilters } from '../get_filters';

interface Options extends CorrelationsOptions {
  durationPercentile: number;
  fieldNames: string[];
  maxLatency: number;
  distributionInterval: number;
}
export async function getCorrelationsForSlowTransactions(options: Options) {
  return withApmSpan('get_correlations_for_slow_transactions', async () => {
    const {
      durationPercentile,
      fieldNames,
      setup,
      maxLatency,
      distributionInterval,
    } = options;
    const { apmEventClient } = setup;
    const filters = getCorrelationsFilters(options);
    const durationForPercentile = await getDurationForPercentile({
      durationPercentile,
      filters,
      setup,
    });

    if (!durationForPercentile) {
      return { significantTerms: [] };
    }

    const params = {
      apm: { events: [ProcessorEvent.transaction] },
      body: {
        size: 0,
        query: {
          bool: {
            // foreground filters
            filter: filters,
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
                      ...filters,
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

    const response = await apmEventClient.search(
      'get_significant_terms',
      params
    );

    if (!response.aggregations) {
      return { significantTerms: [] };
    }

    const topSigTerms = processSignificantTermAggs({
      sigTermAggs: response.aggregations,
    });

    const significantTerms = await getLatencyDistribution({
      setup,
      filters,
      topSigTerms,
      maxLatency,
      distributionInterval,
    });

    return { significantTerms };
  });
}
