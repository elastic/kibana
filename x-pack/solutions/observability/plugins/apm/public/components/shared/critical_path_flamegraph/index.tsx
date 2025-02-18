/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Datum } from '@elastic/charts';
import { Chart, Flame, Settings, Tooltip } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, euiPaletteColorBlind } from '@elastic/eui';
import { css } from '@emotion/css';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import { uniqueId } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import { CriticalPathFlamegraphTooltip } from './critical_path_flamegraph_tooltip';
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
    onLoadTable?: () => void;
  } & ({ serviceName: string; transactionName: string } | {})
) {
  const { start, end, traceIds, traceIdsFetchStatus, onLoadTable } = props;

  const serviceName = 'serviceName' in props ? props.serviceName : null;
  const transactionName = 'transactionName' in props ? props.transactionName : null;

  // Use a reference to time range, to not invalidate the API fetch
  // we only care for traceIds, start/end are there to limit the search
  // request to a certain time range. It shouldn't affect the actual results
  // of the search.
  const timerange = useRef({ start, end });
  timerange.current = { start, end };
  const [hasTableLoaded, setHasTableLoaded] = useState(false);

  const { data: { criticalPath } = { criticalPath: null }, status: criticalPathFetchStatus } =
    useFetcher(
      (callApmApi) => {
        if (!traceIds.length) {
          return Promise.resolve({ criticalPath: null });
        }

        return callApmApi('POST /internal/apm/traces/aggregated_critical_path', {
          params: {
            body: {
              start: timerange.current.start,
              end: timerange.current.end,
              traceIds,
              serviceName,
              transactionName,
            },
          },
        });
      },
      [timerange, traceIds, serviceName, transactionName]
    );

  useEffect(() => {
    if (
      criticalPathFetchStatus === FETCH_STATUS.SUCCESS &&
      traceIdsFetchStatus === FETCH_STATUS.SUCCESS &&
      onLoadTable &&
      !hasTableLoaded
    ) {
      onLoadTable();
      setHasTableLoaded(true);
    }
  }, [
    criticalPathFetchStatus,
    onLoadTable,
    hasTableLoaded,
    traceIdsFetchStatus,
    setHasTableLoaded,
  ]);

  const chartThemes = useChartThemes();

  const isLoading = isPending(traceIdsFetchStatus) || isPending(criticalPathFetchStatus);

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
      // make sure Flame re-renders when data changes, workaround for https://github.com/elastic/elastic-charts/issues/1766
      key: uniqueId(),
    };
  }, [criticalPath]);

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
              <Tooltip
                customTooltip={(tooltipProps) => {
                  const valueIndex = tooltipProps.values[0].valueAccessor as number;
                  const operationId = flameGraph.operationId[valueIndex];
                  const operationMetadata = criticalPath?.metadata[operationId];
                  const countInclusive = flameGraph.viewModel.value[valueIndex];
                  const countExclusive = flameGraph.countExclusive[valueIndex];

                  return (
                    <CriticalPathFlamegraphTooltip
                      metadata={operationMetadata}
                      countInclusive={countInclusive}
                      countExclusive={countExclusive}
                      totalCount={flameGraph.viewModel.value[0]}
                    />
                  );
                }}
              />
              <Settings
                theme={[
                  {
                    chartMargins: themeOverrides.chartMargins,
                    chartPaddings: themeOverrides.chartPaddings,
                  },
                  ...chartThemes.theme,
                ]}
                baseTheme={chartThemes.baseTheme}
                onElementClick={(elements) => {}}
                locale={i18n.getLocale()}
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
