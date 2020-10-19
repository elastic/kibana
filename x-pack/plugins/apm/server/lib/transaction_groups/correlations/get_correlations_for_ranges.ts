/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import {
  getSignificantTermsAgg,
  formatAggregationResponse,
} from './get_significant_terms_agg';
import { SignificantTermsScoring } from './scoring_rt';

export async function getCorrelationsForRanges({
  serviceName,
  transactionType,
  transactionName,
  scoring,
  gapBetweenRanges,
  fieldNames,
  setup,
}: {
  serviceName: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
  scoring: SignificantTermsScoring;
  gapBetweenRanges: number;
  fieldNames: string[];
  setup: Setup & SetupTimeRange;
}) {
  const { start, end, esFilter, apmEventClient } = setup;

  const baseFilters = [...esFilter];

  if (serviceName) {
    baseFilters.push({ term: { [SERVICE_NAME]: serviceName } });
  }

  if (transactionType) {
    baseFilters.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

  if (transactionName) {
    baseFilters.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  const diff = end - start + gapBetweenRanges;
  const baseRangeStart = start - diff;
  const baseRangeEnd = end - diff;
  const backgroundFilters = [
    ...baseFilters,
    { range: rangeFilter(baseRangeStart, baseRangeEnd) },
  ];

  const params = {
    apm: { events: [ProcessorEvent.transaction] },
    body: {
      size: 0,
      query: {
        bool: { filter: [...baseFilters, { range: rangeFilter(start, end) }] },
      },
      aggs: getSignificantTermsAgg({
        fieldNames,
        backgroundFilters,
        backgroundIsSuperset: false,
        scoring,
      }),
    },
  };

  const response = await apmEventClient.search(params);

  return {
    message: `Showing significant fields between the ranges`,
    firstRange: `${new Date(baseRangeStart).toISOString()} - ${new Date(
      baseRangeEnd
    ).toISOString()}`,
    lastRange: `${new Date(start).toISOString()} - ${new Date(
      end
    ).toISOString()}`,
    response: formatAggregationResponse(response.aggregations),
  };
}
