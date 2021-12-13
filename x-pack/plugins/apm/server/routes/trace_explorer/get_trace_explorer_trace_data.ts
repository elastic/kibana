/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { TraceSearchType } from '../../../common/trace_explorer';
import { Setup } from '../../lib/helpers/setup_request';
import { getOverallLatencyDistribution } from '../latency_distribution/get_overall_latency_distribution';
import { getTraceIdsFromEql } from './get_trace_ids_from_eql';
import { getTraceIdsFromKql } from './get_trace_ids_from_kql';

export async function getTraceExplorerTraceData({
  setup,
  environment,
  start,
  end,
  queryLanguage,
  queryString,
}: {
  setup: Setup;
  environment: Environment;
  start: number;
  end: number;
  queryLanguage: TraceSearchType;
  queryString: string;
}) {
  const numTraceIds = 1000;

  const traceIds =
    queryLanguage === TraceSearchType.eql
      ? await getTraceIdsFromEql({
          setup,
          start,
          end,
          environment,
          query: queryString,
          numTraceIds,
        })
      : await getTraceIdsFromKql({
          setup,
          start,
          end,
          environment,
          query: queryString,
          numTraceIds,
        });

  const [distributionData] = await Promise.all([
    getOverallLatencyDistribution({
      setup,
      start,
      end,
      environment,
      kuery: '',
      termFilters: [
        {
          fieldName: TRACE_ID,
          fieldValue: traceIds,
        },
      ],
      percentileThreshold: 95,
    }),
  ]);

  return {
    distributionData,
  };
}
