/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTraceExplorerSamples } from '../../../hooks/use_trace_explorer_samples';
import { CriticalPathFlamegraph } from '../../shared/critical_path_flamegraph';

export function TraceExplorerAggregatedCriticalPath() {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/traces/explorer/critical_path');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const [hasLoadedTable, setHasLoadedTable] = useState(false);
  const { onPageReady } = usePerformanceContext();
  const {
    data: { traceSamples },
    status: samplesFetchStatus,
  } = useTraceExplorerSamples();

  const traceIds = useMemo(() => {
    return traceSamples.map((sample) => sample.traceId);
  }, [traceSamples]);

  useEffect(() => {
    if (hasLoadedTable) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
        customMetrics: {
          key1: 'traceIds',
          value1: traceIds.length,
        },
      });
    }
  }, [hasLoadedTable, onPageReady, rangeFrom, rangeTo, traceIds]);

  return (
    <CriticalPathFlamegraph
      onLoadTable={() => setHasLoadedTable(true)}
      start={start}
      end={end}
      traceIds={traceIds}
      traceIdsFetchStatus={samplesFetchStatus}
    />
  );
}
