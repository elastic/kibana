/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { RuleMonitoringMetrics } from '@kbn/alerting-plugin/common/monitoring/types';
import {
  Chart,
  LineSeries,
  ScaleType,
  Settings,
  DARK_THEME,
  Axis,
  Position,
  timeFormatter,
} from '@elastic/charts';

const dateFormatter = timeFormatter('HH:mm');

const METRICS = [
  {
    label: 'Rate of executions',
    field: 'execution',
  },
  {
    label: 'Average execution time',
    field: 'execution_time',
  },
];

export interface RuleMetricsProps {
  monitoring?: RuleMonitoringMetrics;
}
export const RuleMetrics = (props: RuleMetricsProps) => {
  const monitoring = props.monitoring;
  if (!monitoring) {
    return (
      <>
        <EuiSpacer />
        <EuiEmptyPrompt
          iconType="alert"
          color="warning"
          title={<h2>No metrics found</h2>}
          body={<p>There was an error searching for metrics.</p>}
        />
      </>
    );
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        {METRICS.map((metric) => (
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>{metric.label}</h3>
            </EuiTitle>
            <Chart size={{ height: 200, width: 600 }}>
              <Settings theme={DARK_THEME} />
              <Axis
                id={`chart_bottom_${metric.field}`}
                position={Position.Bottom}
                showOverlappingTicks
                tickFormat={dateFormatter}
              />
              <Axis id="left" position={Position.Left} />
              <LineSeries
                id={`chart_${metric.field}`}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'timestamp'}
                yAccessors={['value']}
                color={['black']}
                data={monitoring[metric.field]?.data}
              />
            </Chart>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { RuleMetrics as default };
