/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_VALUE_DIGITS } from '../../../../common/correlations/constants';
import { Setup } from '../../../lib/helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { getDurationField } from '../utils';

export const fetchDurationPercentiles = async ({
  eventType,
  setup,
  start,
  end,
  environment,
  kuery,
  query,
  percents,
}: CommonCorrelationsQueryParams & {
  eventType: ProcessorEvent;
  setup: Setup;
  percents?: number[];
}): Promise<{
  totalDocs: number;
  percentiles: Record<string, number>;
}> => {
  const params = {
    apm: { events: [eventType] },
    body: {
      track_total_hits: true,
      query: getCommonCorrelationsQuery({
        start,
        end,
        environment,
        kuery,
        query,
      }),
      size: 0,
      aggs: {
        duration_percentiles: {
          percentiles: {
            hdr: {
              number_of_significant_value_digits: SIGNIFICANT_VALUE_DIGITS,
            },
            field: getDurationField(eventType),
            ...(Array.isArray(percents) ? { percents } : {}),
          },
        },
      },
    },
  };
  console.log(JSON.stringify(params));
  const response = await setup.apmEventClient.search(
    'get_duration_percentiles',
    params
  );

  // return early with no results if the search didn't return any documents
  if (!response.aggregations || response.hits.total.value === 0) {
    return { totalDocs: 0, percentiles: {} };
  }

  return {
    totalDocs: response.hits.total.value,
    percentiles: (response.aggregations.duration_percentiles.values ??
      // we know values won't be null because there are hits
      {}) as Record<string, number>,
  };
};
