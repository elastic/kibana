/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmDocumentType } from '../../../../common/document_type';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';

export function ProfilingOverview() {
  const {
    path: { serviceName },
    query: { kuery, rangeFrom, rangeTo, environment },
  } = useApmParams('/services/{serviceName}/profiling');
  const { isProfilingAvailable } = useProfilingPlugin();

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.TransactionMetric,
    numBuckets: 20,
  });
  const { data, status } = useFetcher(
    (callApmApi) => {
      if (isProfilingAvailable && preferred) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
          {
            params: {
              path: { serviceName },
              query: {
                start,
                end,
                kuery,
                environment,
                documentType: preferred.source.documentType,
                rollupInterval: preferred.source.rollupInterval,
              },
            },
          }
        );
      }
    },
    [
      isProfilingAvailable,
      preferred,
      serviceName,
      start,
      end,
      kuery,
      environment,
    ]
  );

  if (!isProfilingAvailable) {
    return null;
  }

  return (
    <EmbeddableFlamegraph
      data={data}
      height="60vh"
      isLoading={isPending(status)}
    />
  );
}
