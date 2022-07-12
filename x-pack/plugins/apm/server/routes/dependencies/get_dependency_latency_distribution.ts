/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { EventOutcome } from '../../../common/event_outcome';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';
import { getOverallLatencyDistribution } from '../latency_distribution/get_overall_latency_distribution';
import { OverallLatencyDistributionResponse } from '../latency_distribution/types';

export async function getDependencyLatencyDistribution({
  setup,
  dependencyName,
  spanName,
  kuery,
  environment,
  start,
  end,
  percentileThreshold,
}: {
  setup: Setup;
  dependencyName: string;
  spanName: string;
  kuery: string;
  environment: Environment;
  start: number;
  end: number;
  percentileThreshold: number;
}): Promise<{
  allSpansDistribution: OverallLatencyDistributionResponse;
  failedSpansDistribution: OverallLatencyDistributionResponse;
}> {
  const commonProps = {
    eventType: ProcessorEvent.span,
    setup,
    start,
    end,
    environment,
    kuery,
    percentileThreshold,
  };

  const commonQuery = {
    bool: {
      filter: [
        ...termQuery(SPAN_NAME, spanName),
        ...termQuery(SPAN_DESTINATION_SERVICE_RESOURCE, dependencyName),
      ],
    },
  };

  const [allSpansDistribution, failedSpansDistribution] = await Promise.all([
    getOverallLatencyDistribution({
      ...commonProps,
      query: commonQuery,
    }),
    getOverallLatencyDistribution({
      ...commonProps,
      query: {
        bool: {
          filter: [
            commonQuery,
            ...termQuery(EVENT_OUTCOME, EventOutcome.failure),
          ],
        },
      },
    }),
  ]);

  return {
    allSpansDistribution,
    failedSpansDistribution,
  };
}
