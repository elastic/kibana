/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import { Chart, Flame, Settings, Datum } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
} from '@elastic/eui';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { uniqueId } from 'lodash';
import React, { useMemo } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { criticalPathToFlamegraph } from './critical_path_to_flamegraph';

const chartClassName = css`
  flex-grow: 1;
`;

export function CriticalPathFlamegraph(
  props: {
    start: string;
    end: string;
    traceIds: string[];
    traceIdsFetchStatus: FETCH_STATUS;
  } & ({ serviceName: string; transactionName: string } | {})
) {
  const { start, end, traceIds, traceIdsFetchStatus } = props;

  const {
    data: { criticalPath } = { criticalPath: null },
    status: criticalPathFetchStatus,
  } = useFetcher(
    (callApmApi) => {
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
    [start, end, traceIds]
  );

  const chartTheme = useChartTheme();

  const isLoading =
    traceIdsFetchStatus === FETCH_STATUS.NOT_INITIATED ||
    traceIdsFetchStatus === FETCH_STATUS.LOADING ||
    criticalPathFetchStatus === FETCH_STATUS.NOT_INITIATED ||
    criticalPathFetchStatus === FETCH_STATUS.LOADING;

  const serviceName = 'serviceName' in props ? props.serviceName : undefined;
  const transactionName =
    'transactionName' in props ? props.transactionName : undefined;

  const flameGraph = useMemo(() => {
    if (!criticalPath) {
      return undefined;
    }

    const colors = euiPaletteColorBlind({});

    const flamegraph = criticalPathToFlamegraph({
      criticalPath,
      colors,
      ...(serviceName && transactionName
        ? {
            serviceName,
            transactionName,
          }
        : {}),
    });

    return {
      ...flamegraph,
      // make sure Flame re-renders when data changes, workaround for https://github.com/elastic/elastic-charts/issues/1766
      key: uniqueId(),
    };
  }, [criticalPath, serviceName, transactionName]);

  const themeOverrides = {
    chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
    chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      alignItems="stretch"
      justifyContent="center"
      style={{ minHeight: 400 }}
    >
      {isLoading ? (
        <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      ) : (
        flameGraph && (
          <EuiFlexItem grow>
            <Chart key={flameGraph.key} className={chartClassName}>
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
