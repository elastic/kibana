/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Chart, Datum, Flame, Settings } from '@elastic/charts';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  euiPaletteColorBlind,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { uniqueId } from 'lodash';
import React, { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { asPercent } from '../../../../common/utils/formatters';
import type { CriticalPathResponse } from '../../../../server/routes/traces/get_aggregated_critical_path';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { AgentIcon } from '../agent_icon';
import { SpanIcon } from '../span_icon';
import { criticalPathToFlamegraph } from './critical_path_to_flamegraph';

const chartClassName = css`
  flex-grow: 1;
`;

function CustomTooltip({
  metadata,
  countInclusive,
  countExclusive,
  totalCount,
}: {
  metadata?: CriticalPathResponse['metadata'][string];
  countInclusive: number;
  countExclusive: number;
  totalCount: number;
}) {
  if (!metadata) {
    return <></>;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        {metadata['processor.event'] === ProcessorEvent.transaction ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              style={{ overflowWrap: 'anywhere' }}
              alignItems="center"
            >
              <EuiFlexItem grow={false}>
                {metadata[TRANSACTION_NAME]}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge>{metadata[TRANSACTION_TYPE]}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiFlexGroup
              direction="row"
              gutterSize="s"
              style={{ overflowWrap: 'anywhere' }}
              alignItems="center"
            >
              <EuiFlexItem grow={false}>
                <SpanIcon
                  type={metadata[SPAN_TYPE]}
                  subtype={metadata[SPAN_SUBTYPE]}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{metadata[SPAN_NAME]}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <AgentIcon agentName={metadata[AGENT_NAME]} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{metadata[SERVICE_NAME]}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.apm.criticalPathFlameGraph.selfTime', {
                defaultMessage: 'Self time: {value}',
                values: {
                  value: asPercent(countExclusive / totalCount, 1),
                },
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.apm.criticalPathFlameGraph.totalTime', {
                defaultMessage: 'Total time: {value}',
                values: {
                  value: asPercent(countInclusive / totalCount, 1),
                },
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export function CriticalPathFlamegraph(
  props: {
    start: string;
    end: string;
    traceIds: string[];
    traceIdsFetchStatus: FETCH_STATUS;
  } & ({ serviceName: string; transactionName: string } | {})
) {
  const { start, end, traceIds, traceIdsFetchStatus } = props;

  const serviceName = 'serviceName' in props ? props.serviceName : null;
  const transactionName =
    'transactionName' in props ? props.transactionName : null;

  // Use a reference to time range, to not invalidate the API fetch
  // we only care for traceIds, start/end are there to limit the search
  // request to a certain time range. It shouldn't affect the actual results
  // of the search.
  const timerange = useRef({ start, end });
  timerange.current = { start, end };

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

  const chartTheme = useChartTheme();

  const isLoading =
    traceIdsFetchStatus === FETCH_STATUS.NOT_INITIATED ||
    traceIdsFetchStatus === FETCH_STATUS.LOADING ||
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
              <Settings
                theme={[
                  {
                    chartMargins: themeOverrides.chartMargins,
                    chartPaddings: themeOverrides.chartPaddings,
                  },
                  ...chartTheme,
                ]}
                tooltip={{
                  customTooltip: (tooltipProps) => {
                    const valueIndex = tooltipProps.values[0]
                      .valueAccessor as number;
                    const operationId = flameGraph.operationId[valueIndex];
                    const operationMetadata =
                      criticalPath?.metadata[operationId];
                    const countInclusive =
                      flameGraph.viewModel.value[valueIndex];
                    const countExclusive =
                      flameGraph.countExclusive[valueIndex];

                    return (
                      <CustomTooltip
                        metadata={operationMetadata}
                        countInclusive={countInclusive}
                        countExclusive={countExclusive}
                        totalCount={flameGraph.viewModel.value[0]}
                      />
                    );
                  },
                }}
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
