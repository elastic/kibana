/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { EventOutcome } from '../../../../common/event_outcome';
import {
  formatTopSignificantTerms,
  TopSigTerm,
} from '../get_correlations_for_slow_transactions/format_top_significant_terms';
import { AggregationOptionsByType } from '../../../../../../typings/elasticsearch/aggregations';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getOutcomeAggregation,
  getTransactionErrorRateTimeSeries,
} from '../../helpers/transaction_error_rate';

export async function getCorrelationsForFailedTransactions({
  serviceName,
  transactionType,
  transactionName,
  fieldNames,
  setup,
}: {
  serviceName: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
  fieldNames: string[];
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, esFilter, apmEventClient } = setup;

  const backgroundFilters: ESFilter[] = [
    ...esFilter,
    { range: rangeFilter(start, end) },
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

  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: {
        bool: {
          // foreground filters
          filter: [
            ...backgroundFilters,
            { term: { [EVENT_OUTCOME]: EventOutcome.failure } },
          ],
        },
      },
      aggs: fieldNames.reduce((acc, fieldName) => {
        return {
          ...acc,
          [fieldName]: {
            significant_terms: {
              size: 10,
              field: fieldName,
              background_filter: { bool: { filter: backgroundFilters } },
            },
          },
        };
      }, {} as Record<string, { significant_terms: AggregationOptionsByType['significant_terms'] }>),
    },
  };

  const response = await apmEventClient.search(params);
  const topSigTerms = formatTopSignificantTerms(response.aggregations);
  return getChartsForTopSigTerms({ setup, backgroundFilters, topSigTerms });
}

export async function getChartsForTopSigTerms({
  setup,
  backgroundFilters,
  topSigTerms,
}: {
  setup: Setup & SetupTimeRange;
  backgroundFilters: ESFilter[];
  topSigTerms: TopSigTerm[];
}) {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end, numBuckets: 30 });

  if (isEmpty(topSigTerms)) {
    return;
  }

  const timeseriesAgg = {
    date_histogram: {
      field: '@timestamp',
      fixed_interval: intervalString,
      min_doc_count: 0,
      extended_bounds: { min: start, max: end },
    },
    aggs: {
      // TODO: add support for metrics
      outcomes: getOutcomeAggregation({ searchAggregatedTransactions: false }),
    },
  };

  const perTermAggs = topSigTerms.reduce(
    (acc, term, index) => {
      acc[`term_${index}`] = {
        filter: { term: { [term.fieldName]: term.fieldValue } },
        aggs: { timeseries: timeseriesAgg },
      };
      return acc;
    },
    {} as Record<
      string,
      {
        filter: AggregationOptionsByType['filter'];
        aggs: { timeseries: typeof timeseriesAgg };
      }
    >
  );

  const params = {
    // TODO: add support for metrics
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: { bool: { filter: backgroundFilters } },
      aggs: {
        // overall aggs
        timeseries: timeseriesAgg,

        // per term aggs
        ...perTermAggs,
      },
    },
  };

  const response = await apmEventClient.search(params);
  type Agg = NonNullable<typeof response.aggregations>;

  if (!response.aggregations) {
    return;
  }

  return {
    overall: {
      timeseries: getTransactionErrorRateTimeSeries(
        response.aggregations.timeseries.buckets
      ),
    },
    significantTerms: topSigTerms.map((topSig, index) => {
      // @ts-expect-error
      const agg = response.aggregations[`term_${index}`] as Agg;

      return {
        ...topSig,
        timeseries: getTransactionErrorRateTimeSeries(agg.timeseries.buckets),
      };
    }),
  };
}
