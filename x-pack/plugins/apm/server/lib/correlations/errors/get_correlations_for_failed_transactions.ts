/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, omit } from 'lodash';
import { EventOutcome } from '../../../../common/event_outcome';
import {
  processSignificantTermAggs,
  TopSigTerm,
} from '../process_significant_term_aggs';
import { AggregationOptionsByType } from '../../../../../../../typings/elasticsearch';
import { ESFilter } from '../../../../../../../typings/elasticsearch';
import { EVENT_OUTCOME } from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getTimeseriesAggregation,
  getTransactionErrorRateTimeSeries,
} from '../../helpers/transaction_error_rate';
import { CorrelationsOptions, getCorrelationsFilters } from '../get_filters';

interface Options extends CorrelationsOptions {
  fieldNames: string[];
}
export async function getCorrelationsForFailedTransactions(options: Options) {
  const { fieldNames, setup } = options;
  const { apmEventClient } = setup;
  const filters = getCorrelationsFilters(options);

  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    track_total_hits: true,
    body: {
      size: 0,
      query: {
        bool: { filter: filters },
      },
      aggs: {
        failed_transactions: {
          filter: { term: { [EVENT_OUTCOME]: EventOutcome.failure } },

          // significant term aggs
          aggs: fieldNames.reduce((acc, fieldName) => {
            return {
              ...acc,
              [fieldName]: {
                significant_terms: {
                  size: 10,
                  field: fieldName,
                  background_filter: {
                    bool: {
                      filter: filters,
                      must_not: {
                        term: { [EVENT_OUTCOME]: EventOutcome.failure },
                      },
                    },
                  },
                },
              },
            };
          }, {} as Record<string, { significant_terms: AggregationOptionsByType['significant_terms'] }>),
        },
      },
    },
  };

  const response = await apmEventClient.search(
    'get_correlations_for_failed_transactions',
    params
  );
  if (!response.aggregations) {
    return { significantTerms: [] };
  }

  const sigTermAggs = omit(
    response.aggregations?.failed_transactions,
    'doc_count'
  );

  const topSigTerms = processSignificantTermAggs({ sigTermAggs });
  return getErrorRateTimeSeries({ setup, filters, topSigTerms });
}

export async function getErrorRateTimeSeries({
  setup,
  filters,
  topSigTerms,
}: {
  setup: Setup & SetupTimeRange;
  filters: ESFilter[];
  topSigTerms: TopSigTerm[];
}) {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end, numBuckets: 15 });

  if (isEmpty(topSigTerms)) {
    return { significantTerms: [] };
  }

  const timeseriesAgg = getTimeseriesAggregation(start, end, intervalString);

  const perTermAggs = topSigTerms.reduce(
    (acc, term, index) => {
      acc[`term_${index}`] = {
        filter: { term: { [term.fieldName]: term.fieldValue } },
        aggs: { timeseries: timeseriesAgg },
      };
      return acc;
    },
    {} as {
      [key: string]: {
        filter: AggregationOptionsByType['filter'];
        aggs: { timeseries: typeof timeseriesAgg };
      };
    }
  );

  const params = {
    // TODO: add support for metrics
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: { bool: { filter: filters } },
      aggs: perTermAggs,
    },
  };

  const response = await apmEventClient.search(
    'get_error_rate_timeseries',
    params
  );
  const { aggregations } = response;

  if (!aggregations) {
    return { significantTerms: [] };
  }

  return {
    significantTerms: topSigTerms.map((topSig, index) => {
      const agg = aggregations[`term_${index}`]!;

      return {
        ...topSig,
        timeseries: getTransactionErrorRateTimeSeries(agg.timeseries.buckets),
      };
    }),
  };
}
