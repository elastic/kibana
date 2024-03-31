/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { groupBy, mapValues, orderBy } from 'lodash';
import {
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  PartialTheme,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { ChangePointType } from '@kbn/es-types/src';
import dedent from 'dedent';
import type {
  ChangesArguments,
  ChangesFunctionResponse,
  LogChangeWithTimeseries,
  MetricChangeWithTimeseries,
} from '../../../common/functions/changes';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../../types';
import { useChartTheme } from '../../hooks/use_chart_theme';

function sortAndGroup<T extends LogChangeWithTimeseries | MetricChangeWithTimeseries>(
  groups: T[]
): Array<{ name: string; items: T[] }> {
  const grouped = mapValues(groupBy(groups, 'name'), (items, key) => {
    return {
      name: key,
      items: orderBy(items, (item) => item.changes?.p_value ?? Number.POSITIVE_INFINITY),
    };
  });

  return orderBy(grouped, (group) => group.items[0].changes?.p_value ?? Number.POSITIVE_INFINITY);
}

function ChangeGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText size="s">{title}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SparkPlot({
  type,
  timeseries,
}: {
  type: 'line' | 'bar';
  timeseries: Array<{ x: number; y: number | null }>;
}) {
  const defaultChartTheme = useChartTheme();

  const sparkplotChartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
  };

  return (
    <Chart
      size={{
        width: 128,
        height: 64,
      }}
    >
      <Settings
        theme={[sparkplotChartTheme, ...defaultChartTheme.theme]}
        baseTheme={defaultChartTheme.baseTheme}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      <Tooltip type="none" />
      {type && type === 'bar' ? (
        <BarSeries
          id="Sparkbar"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={timeseries}
        />
      ) : (
        <LineSeries
          id="Sparkline"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={timeseries}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      )}
    </Chart>
  );
}

function ChangePointLabel({
  change: { type, time, p_value: pValue },
}: {
  change: { type: ChangePointType; time?: string; p_value?: number };
}) {
  const label =
    type === 'indeterminable' || time === undefined ? (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.observabilityAiAssistant.changes.noSignificantChanges', {
          defaultMessage: 'No significant changes',
        })}
      </EuiText>
    ) : (
      <EuiText size="xs">
        {i18n.translate('xpack.observabilityAiAssistant.changes.changePointDetected', {
          defaultMessage: dedent(`{type, select,
            dip {Dip}
            distribution_change {Distribution change}
            non_stationary {Non-stationary}
            spike {Spike}
            stationary {Stationary}
            step_change {Step change}
            trend_change {Trend change}
          } detected at {time}`),
          values: {
            type,
            time: new Date(time).toLocaleString(),
          },
        })}
      </EuiText>
    );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false} />
      <EuiFlexItem grow>{label}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ChangeGroupItem({
  title,
  type,
  timeseries,
  change,
}: {
  title: string;
  type: 'line' | 'bar';
  timeseries: Array<{ x: number; y: number | null }>;
  change: {
    time?: string;
    type: ChangePointType;
    p_value?: number;
  };
}) {
  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow={false}>
        <SparkPlot type={type} timeseries={timeseries} />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <EuiFlexGroup direction="column" gutterSize="none">
          {title && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">{title}</EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ChangePointLabel change={change} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function LogChanges({ logs }: { logs: LogChangeWithTimeseries[] }) {
  const logsGroupedAndSorted = sortAndGroup(logs);

  return (
    <EuiFlexGroup direction="column">
      {logsGroupedAndSorted.map((group) => (
        <EuiFlexItem>
          <ChangeGroup title={group.name} key={group.name}>
            {group.items.map((item) => (
              <ChangeGroupItem
                type="bar"
                key={item.key}
                timeseries={item.over_time}
                change={item.changes}
                title={item.pattern}
              />
            ))}
          </ChangeGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function MetricChanges({ metrics }: { metrics: MetricChangeWithTimeseries[] }) {
  const metricsGroupedAndSorted = sortAndGroup(metrics);

  return (
    <EuiFlexGroup direction="column">
      {metricsGroupedAndSorted.map((group) => (
        <EuiFlexItem>
          <ChangeGroup title={group.name} key={group.name}>
            {group.items.map((item) => (
              <ChangeGroupItem
                type="line"
                key={item.key}
                timeseries={item.over_time}
                change={item.changes}
                title={item.key}
              />
            ))}
          </ChangeGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function registerChangesRenderFunction({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  const renderFunction: RenderFunction<ChangesArguments, ChangesFunctionResponse> = ({
    arguments: args,
    response,
  }) => {
    const {
      data: {
        changes: { metrics, logs },
      },
    } = response;

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        {logs.length ? (
          <EuiFlexItem grow={false}>
            <LogChanges logs={logs} />
          </EuiFlexItem>
        ) : null}

        {metrics.length ? (
          <EuiFlexItem grow={false}>
            <MetricChanges metrics={metrics} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };
  registerRenderFunction('changes', renderFunction);
}
