/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiEmptyPrompt,
  EuiTitle,
  EuiSelect,
  EuiLoadingChart,
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
  numberOfExecutions: number;
  onChangeDuration: (length: number) => void;
  isLoading?: boolean;
}

const NUM_EXECUTIONS_OPTIONS = [120, 60, 30, 15].map((value) => ({
  value,
  text: i18n.translate(
    'xpack.triggersActionsUI.sections.executionDurationChart.numberOfExecutionsOption',
    {
      defaultMessage: '{value} executions',
      values: {
        value,
      },
    }
  ),
}));

export const ExecutionDurationChart: React.FunctionComponent<ComponentOpts> = ({
  executionDuration,
  numberOfExecutions,
  onChangeDuration,
  isLoading,
}: ComponentOpts) => {
  const paddedExecutionDurations = padOrTruncateDurations(
    executionDuration.valuesWithTimestamp,
    numberOfExecutions
  );

  const onChange = useCallback(
    ({ target }) => onChangeDuration(Number(target.value)),
    [onChangeDuration]
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
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiSelect
              id="select-number-execution-durations"
              options={NUM_EXECUTIONS_OPTIONS}
              value={numberOfExecutions}
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.executionDurationChart.selectNumberOfExecutionDurationsLabel',
                {
                  defaultMessage: 'Select number of executions',
                }
              )}
              onChange={onChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
      {isLoading && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false} style={{ height: '80px', justifyContent: 'center' }}>
            <EuiLoadingChart size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {!isLoading &&
        (executionDuration.valuesWithTimestamp &&
        Object.entries(executionDuration.valuesWithTimestamp).length > 0 ? (
          <>
            <Chart data-test-subj="executionDurationChart" size={{ height: 80 }}>
              <Settings
                // TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
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
        ))}
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
