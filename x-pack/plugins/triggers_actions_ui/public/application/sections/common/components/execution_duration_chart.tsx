/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiEmptyPrompt,
  EuiIconTip,
  EuiTitle,
} from '@elastic/eui';
import { euiLightVars as lightEuiTheme } from '@kbn/ui-theme';
import { Axis, BarSeries, Chart, CurveType, LineSeries, Settings } from '@elastic/charts';
import { assign, fill } from 'lodash';
import moment from 'moment';
import { formatMillisForDisplay } from '../../../lib/execution_duration_utils';

export interface ComponentOpts {
  executionDuration: {
    average: number;
    valuesWithTimestamp: Record<string, number>;
  };
}

const DESIRED_NUM_EXECUTION_DURATIONS = 30;

export const ExecutionDurationChart: React.FunctionComponent<ComponentOpts> = ({
  executionDuration,
}: ComponentOpts) => {
  const paddedExecutionDurations = padOrTruncateDurations(
    executionDuration.valuesWithTimestamp,
    DESIRED_NUM_EXECUTION_DURATIONS
  );

  return (
    <EuiPanel data-test-subj="executionDurationChartPanel" hasBorder={true}>
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.executionDurationChart.recentDurationsTitle"
                defaultMessage="Recent execution durations"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            color="subdued"
            type="questionInCircle"
            content={i18n.translate(
              'xpack.triggersActionsUI.sections.executionDurationChart.recentDurationsTooltip',
              {
                defaultMessage: `Recent rule executions include up to the last {numExecutions} executions.`,
                values: {
                  numExecutions: DESIRED_NUM_EXECUTION_DURATIONS,
                },
              }
            )}
            position="top"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {executionDuration.valuesWithTimestamp &&
      Object.entries(executionDuration.valuesWithTimestamp).length > 0 ? (
        <>
          <Chart data-test-subj="executionDurationChart" size={{ height: 80 }}>
            <Settings
              theme={{
                lineSeriesStyle: {
                  point: { visible: false },
                  line: { stroke: lightEuiTheme.euiColorAccent },
                },
              }}
            />
            <BarSeries
              id="executionDuration"
              name={i18n.translate(
                'xpack.triggersActionsUI.sections.executionDurationChart.durationLabel',
                {
                  defaultMessage: `Duration`,
                }
              )}
              xScaleType="linear"
              yScaleType="linear"
              xAccessor={0}
              yAccessors={[1]}
              data={paddedExecutionDurations.map(([timestamp, val], ndx) => [
                timestamp ? moment(timestamp).format('D MMM YYYY @ HH:mm:ss') : ndx,
                val,
              ])}
              minBarHeight={2}
            />
            <LineSeries
              id="rule_duration_avg"
              name={i18n.translate(
                'xpack.triggersActionsUI.sections.executionDurationChart.avgDurationLabel',
                {
                  defaultMessage: `Avg Duration`,
                }
              )}
              xScaleType="linear"
              yScaleType="linear"
              xAccessor={0}
              yAccessors={[1]}
              data={paddedExecutionDurations.map(([timestamp, val], ndx) => [
                timestamp ? moment(timestamp).format('D MMM YYYY @ HH:mm:ss') : ndx,
                val ? executionDuration.average : null,
              ])}
              curve={CurveType.CURVE_NATURAL}
            />
            <Axis id="left-axis" position="left" tickFormat={(d) => formatMillisForDisplay(d)} />
          </Chart>
        </>
      ) : (
        <>
          <EuiEmptyPrompt
            data-test-subj="executionDurationChartEmpty"
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.executionDurationChart.executionDurationNoData"
                    defaultMessage="There are no available executions for this rule."
                  />
                </p>
              </>
            }
          />
        </>
      )}
    </EuiPanel>
  );
};

export function padOrTruncateDurations(
  valuesWithTimestamp: Record<string, number>,
  desiredSize: number
) {
  const values = Object.entries(valuesWithTimestamp);
  if (values.length === desiredSize) {
    return values;
  } else if (values.length < desiredSize) {
    return assign(fill(new Array(desiredSize), [null, null]), values);
  } else {
    // oldest durations are at the start of the array, so take the last {desiredSize} values
    return values.slice(-desiredSize);
  }
}
