/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { termQuery } from '@kbn/observability-plugin/server';
import type {
  CommonCorrelationsQueryParams,
  FieldValuePair,
} from '../../../../common/correlations/types';

import {
  CORRELATION_THRESHOLD,
  KS_TEST_THRESHOLD,
} from '../../../../common/correlations/constants';

import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../../lib/helpers/setup_request';
import { fetchDurationCorrelation } from './fetch_duration_correlation';
import { fetchDurationRanges } from './fetch_duration_ranges';

export async function fetchDurationCorrelationWithHistogram({
  setup,
  eventType,
  start,
  end,
  environment,
  kuery,
  query,
  expectations,
  ranges,
  fractions,
  histogramRangeSteps,
  totalDocCount,
  fieldValuePair,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  eventType: ProcessorEvent;
  expectations: number[];
  ranges: estypes.AggregationsAggregationRange[];
  fractions: number[];
  histogramRangeSteps: number[];
  totalDocCount: number;
  fieldValuePair: FieldValuePair;
}) {
  const queryWithFieldValuePair = {
    bool: {
      filter: [
        query,
        ...termQuery(fieldValuePair.fieldName, fieldValuePair.fieldValue),
      ],
    },
  };

  const { correlation, ksTest } = await fetchDurationCorrelation({
    setup,
    eventType,
    start,
    end,
    environment,
    kuery,
    query: queryWithFieldValuePair,
    expectations,
    fractions,
    ranges,
    totalDocCount,
  });

  if (correlation !== null && ksTest !== null && !isNaN(ksTest)) {
    if (correlation > CORRELATION_THRESHOLD && ksTest < KS_TEST_THRESHOLD) {
      const logHistogram = await fetchDurationRanges({
        setup,
        eventType,
        start,
        end,
        environment,
        kuery,
        query: queryWithFieldValuePair,
        rangeSteps: histogramRangeSteps,
      });
      return {
        ...fieldValuePair,
        correlation,
        ksTest,
        histogram: logHistogram,
      };
    } else {
      return {
        ...fieldValuePair,
        correlation,
        ksTest,
      };
    }
  }

  return undefined;
}
