/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../../../typings/elasticsearch';
import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { asDuration } from '../../../../common/utils/formatters';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getDurationForPercentile } from './get_duration_for_percentile';
import {
  formatAggregationResponse,
  getSignificantTermsAgg,
} from './get_significant_terms_agg';
import { SignificantTermsScoring } from './scoring_rt';

export async function getCorrelationsForSlowTransactions({
  serviceName,
  transactionType,
  transactionName,
  durationPercentile,
  fieldNames,
  scoring,
  setup,
}: {
  serviceName: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
  scoring: SignificantTermsScoring;
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
      aggs: getSignificantTermsAgg({ fieldNames, backgroundFilters, scoring }),
    },
  };

  const response = await apmEventClient.search(params);

  return {
    message: `Showing significant fields for transactions slower than ${durationPercentile}th percentile (${asDuration(
      durationForPercentile
    )})`,
    response: formatAggregationResponse(response.aggregations),
  };
}
