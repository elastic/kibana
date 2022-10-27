/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Chart, Datum, Flame, Settings } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { uniqueId } from 'lodash';
import React, { useMemo } from 'react';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTraceExplorerSamples } from '../../../hooks/use_trace_explorer_samples';
import { criticalPathToFlamegraph } from './critical_path_to_flamegraph';

export function TraceExplorerAggregatedCriticalPath() {
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/traces/explorer/critical_path');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    data: { traceSamples },
    status: samplesFetchStatus,
  } = useTraceExplorerSamples();

  const {
    data: { criticalPath } = { criticalPath: null },
    status: criticalPathFetchStatus,
  } = useFetcher(
    (callApmApi) => {
      const traceIds = traceSamples.map((sample) => sample.traceId);

      if (!traceIds.length) {
        return Promise.resolve({ criticalPath: null });
      }

      return callApmApi('POST /internal/apm/traces/aggregated_critical_path', {
        params: {
          body: {
            start,
            end,
            traceIds,
          },
        },
      });
    },
    [start, end, traceSamples]
  );

  const chartTheme = useChartTheme();

  const isLoading =
    samplesFetchStatus === FETCH_STATUS.NOT_INITIATED ||
    samplesFetchStatus === FETCH_STATUS.LOADING ||
    criticalPathFetchStatus === FETCH_STATUS.NOT_INITIATED ||
    criticalPathFetchStatus === FETCH_STATUS.LOADING;

  const flameGraph = useMemo(() => {
    if (!criticalPath) {
      return undefined;
    }

    const colors = euiPaletteColorBlind({});

    const flamegraph = criticalPathToFlamegraph({
      criticalPath,
      colors,
    });

    return {
      ...flamegraph,
      key: uniqueId(),
    };
  }, [criticalPath]);

  const themeOverrides = {
    chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
    chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  };

  return (
    <EuiFlexGroup direction="column">
      {isLoading ? (
        <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
      ) : (
        flameGraph && (
          <EuiFlexItem>
            <Chart key={flameGraph.key}>
              <Settings
                theme={[
                  {
                    chartMargins: themeOverrides.chartMargins,
                    chartPaddings: themeOverrides.chartPaddings,
                  },
                  ...chartTheme,
                ]}
                onElementClick={(elements) => {}}
              />
              <Flame
                id="aggregated_critical_path"
                columnarData={flameGraph.viewModel}
                valueAccessor={(d: Datum) => d.value as number}
                valueFormatter={(value) => `${value}`}
                animation={{ duration: 100 }}
                controlProviderCallback={{}}
              />
            </Chart>
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
}
