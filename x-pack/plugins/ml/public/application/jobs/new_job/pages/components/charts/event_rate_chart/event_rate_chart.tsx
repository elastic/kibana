/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  HistogramBarSeries,
  Chart,
  ScaleType,
  Settings,
  TooltipType,
  BrushEndListener,
  PartialTheme,
} from '@elastic/charts';
import { Axes } from '../common/axes';
import { LineChartPoint } from '../../../../common/chart_loader';
import { Anomaly } from '../../../../common/results_loader';
import { useChartColors } from '../common/settings';
import { LoadingWrapper } from '../loading_wrapper';
import { Anomalies } from '../common/anomalies';
import { OverlayRange } from './overlay_range';

interface Props {
  eventRateChartData: LineChartPoint[];
  anomalyData?: Anomaly[];
  height: string;
  width: string;
  showAxis?: boolean;
  loading?: boolean;
  fadeChart?: boolean;
  overlayRanges?: Array<{
    start: number;
    end: number;
    color: string;
    showMarker?: boolean;
  }>;
  onBrushEnd?: BrushEndListener;
}

export const EventRateChart: FC<Props> = ({
  eventRateChartData,
  anomalyData,
  height,
  width,
  showAxis,
  loading = false,
  fadeChart,
  overlayRanges,
  onBrushEnd,
}) => {
  const { EVENT_RATE_COLOR_WITH_ANOMALIES, EVENT_RATE_COLOR } = useChartColors();
  const barColor = fadeChart ? EVENT_RATE_COLOR_WITH_ANOMALIES : EVENT_RATE_COLOR;

  const theme: PartialTheme = {
    scales: { histogramPadding: 0.2 },
  };

  return (
    <div
      style={{ width, height }}
      data-test-subj={`mlEventRateChart ${eventRateChartData.length ? 'withData' : 'empty'}`}
    >
      <LoadingWrapper height={height} hasData={eventRateChartData.length > 0} loading={loading}>
        <Chart>
          {showAxis === true && <Axes />}

          {onBrushEnd === undefined ? (
            <Settings tooltip={TooltipType.None} theme={theme} />
          ) : (
            <Settings tooltip={TooltipType.None} onBrushEnd={onBrushEnd} theme={theme} />
          )}

          {overlayRanges &&
            overlayRanges.map((range, i) => (
              <OverlayRange
                key={i}
                overlayKey={i}
                eventRateChartData={eventRateChartData}
                start={range.start}
                end={range.end}
                color={range.color}
                showMarker={range.showMarker}
              />
            ))}

          <Anomalies anomalyData={anomalyData} />
          <HistogramBarSeries
            id="event_rate"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={'time'}
            yAccessors={['value']}
            data={eventRateChartData}
            color={barColor}
          />
        </Chart>
      </LoadingWrapper>
    </div>
  );
};
