/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { termQuery } from '@kbn/observability-plugin/server';
import type {
  CommonCorrelationsQueryParams,
  EntityType,
  FieldValuePair,
} from '../../../../common/correlations/types';

import {
  CORRELATION_THRESHOLD,
  KS_TEST_THRESHOLD,
} from '../../../../common/correlations/constants';

import { fetchDurationCorrelation } from './fetch_duration_correlation';
import { fetchDurationRanges } from './fetch_duration_ranges';
import { getEventTypeFromEntityType } from '../utils';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function fetchDurationCorrelationWithHistogram({
  apmEventClient,
  entityType,
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
  includeHistogram = true,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  entityType: EntityType;
  expectations: number[];
  ranges: estypes.AggregationsAggregationRange[];
  fractions: number[];
  histogramRangeSteps: number[];
  totalDocCount: number;
  fieldValuePair: FieldValuePair;
  includeHistogram?: boolean;
}) {
  const eventType = getEventTypeFromEntityType(entityType);
  const queryWithFieldValuePair = {
    bool: {
      filter: [query, ...termQuery(fieldValuePair.fieldName, fieldValuePair.fieldValue)],
    },
  };

  const { correlation, ksTest } = await fetchDurationCorrelation({
    apmEventClient,
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
      if (!includeHistogram) {
        return {
          ...fieldValuePair,
          correlation,
          ksTest,
        };
      }
      const { durationRanges: histogram } = await fetchDurationRanges({
        apmEventClient,
        entityType,
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
        histogram,
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
