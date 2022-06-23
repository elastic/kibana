/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  SPAN_DURATION,
  TRANSACTION_DURATION,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { Setup } from '../../../lib/helpers/setup_request';
import { getCommonCorrelationsQuery } from './get_common_correlations_query';
import { Environment } from '../../../../common/environment_rt';

export const fetchDurationRanges = async ({
  rangeSteps,
  setup,
  start,
  end,
  environment,
  kuery,
  query,
  eventType,
}: {
  rangeSteps: number[];
  setup: Setup;
  start: number;
  end: number;
  environment: Environment;
  kuery: string;
  query: estypes.QueryDslQueryContainer;
  eventType: ProcessorEvent;
}): Promise<Array<{ key: number; doc_count: number }>> => {
  const { apmEventClient } = setup;

  const ranges = rangeSteps.reduce(
    (p, to) => {
      const from = p[p.length - 1].to;
      p.push({ from, to });
      return p;
    },
    [{ to: 0 }] as Array<{ from?: number; to?: number }>
  );
  if (ranges.length > 0) {
    ranges.push({ from: ranges[ranges.length - 1].to });
  }

  const resp = await apmEventClient.search('get_duration_ranges', {
    apm: {
      events: [eventType],
    },
    body: {
      size: 0,
      query: getCommonCorrelationsQuery({
        start,
        end,
        environment,
        kuery,
        query,
      }),
      aggs: {
        logspace_ranges: {
          range: {
            field:
              eventType === ProcessorEvent.span
                ? SPAN_DURATION
                : TRANSACTION_DURATION,
            ranges,
          },
        },
      },
    },
  });

  return (
    resp.aggregations?.logspace_ranges.buckets
      .map((d) => ({
        key: d.from,
        doc_count: d.doc_count,
      }))
      .filter(
        (d): d is { key: number; doc_count: number } => d.key !== undefined
      ) ?? []
  );
};
