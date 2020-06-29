/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  Position,
  timeFormatter,
  BrushEndListener,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiToolTip } from '@elastic/eui';
import { HistogramPoint } from '../../../../common/runtime_types';
import { getChartDateLabel, seriesHasDownValues } from '../../../lib/helper';
import { UptimeThemeContext } from '../../../contexts';
import { useAbsoluteDateRange } from '../../../hooks';

export interface MonitorBarSeriesProps {
  /**
   * The timeseries data to display.
   */
  histogramSeries: HistogramPoint[] | null;
}

export const MonitorBarSeries: React.FC<MonitorBarSeriesProps> = (props) => {
  const { from, to, updateDateRange } = useAbsoluteDateRange();
  return (
    <MonitorBarSeriesComponent from={from} to={to} {...props} updateDateRange={updateDateRange} />
  );
};

export type Props = MonitorBarSeriesProps & {
  from: number;
  to: number;
  updateDateRange: (min: number, max: number) => void;
};

/**
 * There is a specific focus on the monitor's down count, the up series is not shown,
 * so we will only render the series component if there are down counts for the selected monitor.
 * @param props - the values for the monitor this chart visualizes
 */
export const MonitorBarSeriesComponent: React.FC<Props> = ({
  histogramSeries,
  from,
  to,
  updateDateRange,
}) => {
  const {
    colors: { danger },
    chartTheme,
  } = useContext(UptimeThemeContext);

  const onBrushEnd: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [min, max] = x;

    updateDateRange(min, max);
  };

  const id = 'downSeries';

  return seriesHasDownValues(histogramSeries) ? (
    <div style={{ height: 50, width: '100%', maxWidth: '1200px', marginRight: 15 }}>
      <Chart>
        <Settings xDomain={{ min: from, max: to }} onBrushEnd={onBrushEnd} {...chartTheme} />
        <Axis
          hide
          id="bottom"
          position={Position.Bottom}
          tickFormat={timeFormatter(getChartDateLabel(from, to))}
        />
        <BarSeries
          id={id}
          color={danger}
          data={(histogramSeries || []).map(({ timestamp, down }) => [timestamp, down])}
          name={i18n.translate('xpack.uptime.monitorList.downLineSeries.downLabel', {
            defaultMessage: 'Down checks',
          })}
          timeZone="local"
          xAccessor={0}
          xScaleType={ScaleType.Time}
          yAccessors={[1]}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </div>
  ) : (
    <EuiToolTip
      position="top"
      content={
        <FormattedMessage
          id="xpack.uptime.monitorList.noDownHistory"
          defaultMessage="This monitor has never been {emphasizedText} during the selected time range."
          values={{ emphasizedText: <strong>down</strong> }}
        />
      }
    >
      <EuiText color="secondary">--</EuiText>
    </EuiToolTip>
  );
};
