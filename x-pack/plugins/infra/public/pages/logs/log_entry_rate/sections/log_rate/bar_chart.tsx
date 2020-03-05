/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Settings,
  TooltipValue,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';

export const LogEntryRateBarChart: React.FunctionComponent<{
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  series: Array<{ group: string; time: number; value: number }>;
}> = ({ series, setTimeRange, timeRange }) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const [isDarkMode] = useKibanaUiSetting('theme:darkMode');

  const chartDateFormatter = useMemo(
    () => niceTimeFormatter([timeRange.startTime, timeRange.endTime]),
    [timeRange]
  );

  const tooltipProps = useMemo(
    () => ({
      headerFormatter: (tooltipData: TooltipValue) =>
        moment(tooltipData.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
    }),
    [dateFormat]
  );

  const handleBrushEnd = useCallback(
    (startTime: number, endTime: number) => {
      setTimeRange({
        endTime,
        startTime,
      });
    },
    [setTimeRange]
  );

  return (
    <div style={{ height: 200, width: '100%' }}>
      <Chart className="log-entry-rate-chart">
        <Axis
          id="timestamp"
          position="bottom"
          showOverlappingTicks
          tickFormat={chartDateFormatter}
        />
        <Axis
          id="values"
          position="left"
          tickFormat={value => numeral(value.toPrecision(3)).format('0[.][00]a')} // https://github.com/adamwdraper/Numeral-js/issues/194
        />
        <BarSeries
          id="averageValues"
          name={i18n.translate('xpack.infra.logs.analysis.logRateSectionLineSeriesName', {
            defaultMessage: 'Log entries per 15 minutes (avg)',
          })}
          xScaleType="time"
          yScaleType="linear"
          xAccessor={'time'}
          yAccessors={['value']}
          splitSeriesAccessors={['group']}
          stackAccessors={['time']}
          data={series}
        />
        <Settings
          onBrushEnd={handleBrushEnd}
          tooltip={tooltipProps}
          theme={isDarkMode ? DARK_THEME : LIGHT_THEME}
          showLegend
          legendPosition="right"
          xDomain={{ min: timeRange.startTime, max: timeRange.endTime }}
        />
      </Chart>
    </div>
  );
};
