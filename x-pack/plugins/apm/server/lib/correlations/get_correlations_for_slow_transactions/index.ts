/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationOptionsByType } from '../../../../../../typings/elasticsearch/aggregations';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getDurationForPercentile } from './get_duration_for_percentile';
import { formatTopSignificantTerms } from './format_top_significant_terms';
import { getChartsForTopSigTerms } from './get_charts_for_top_sig_terms';

export async function getCorrelationsForSlowTransactions({
  serviceName,
  transactionType,
  transactionName,
  durationPercentile,
  fieldNames,
  setup,
}: {
  serviceName: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
  durationPercentile: number;
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

  const durationForPercentile = await getDurationForPercentile({
    durationPercentile,
    backgroundFilters,
    setup,
  });

  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: {
        bool: {
          // foreground filters
          filter: [
            ...backgroundFilters,
            {
              range: { [TRANSACTION_DURATION]: { gte: durationForPercentile } },
            },
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
