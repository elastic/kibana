/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  Axis,
  BarSeries,
  BrushEndListener,
  Chart,
  ElementClickListener,
  Position,
  ScaleType,
  Settings,
  XYChartElementEvent,
  XYBrushEvent,
} from '@elastic/charts';
import moment from 'moment';
import { IUiSettingsClient } from '@kbn/core/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import { useDataVisualizerKibana } from '../../../../kibana_context';

export interface DocumentCountChartPoint {
  time: number | string;
  value: number;
}

interface Props {
  width?: number;
  chartPoints: DocumentCountChartPoint[];
  timeRangeEarliest: number;
  timeRangeLatest: number;
  interval?: number;
}

const SPEC_ID = 'document_count';

function getTimezone(uiSettings: IUiSettingsClient) {
  if (uiSettings.isDefault('dateFormat:tz')) {
    const detectedTimezone = moment.tz.guess();
    if (detectedTimezone) return detectedTimezone;
    else return moment().format('Z');
  } else {
    return uiSettings.get('dateFormat:tz', 'Browser');
  }
}

export const DocumentCountChart: FC<Props> = ({
  width,
  chartPoints,
  timeRangeEarliest,
  timeRangeLatest,
  interval,
}) => {
  const {
    services: { data, uiSettings, fieldFormats, charts },
  } = useDataVisualizerKibana();

  const chartTheme = charts.theme.useChartsTheme();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
  const useLegacyTimeAxis = uiSettings.get('visualization:useLegacyTimeAxis', false);

  const seriesName = i18n.translate(
    'xpack.dataVisualizer.dataGrid.field.documentCountChart.seriesLabel',
    {
      defaultMessage: 'document count',
    }
  );

  const xDomain = {
    min: timeRangeEarliest,
    max: timeRangeLatest,
  };

  const adjustedChartPoints = useMemo(() => {
    // Display empty chart when no data in range
    if (chartPoints.length < 1) return [{ time: timeRangeEarliest, value: 0 }];

    // If chart has only one bucket
    // it won't show up correctly unless we add an extra data point
    if (chartPoints.length === 1) {
      return [
        ...chartPoints,
        { time: interval ? Number(chartPoints[0].time) + interval : timeRangeEarliest, value: 0 },
      ];
    }
    return chartPoints;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPoints, timeRangeEarliest, timeRangeLatest, interval]);

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const onBrushEnd = ({ x }: XYBrushEvent) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    timefilterUpdateHandler({ from, to });
  };

  const onElementClick: ElementClickListener = ([elementData]) => {
    const startRange = (elementData as XYChartElementEvent)[0].x;

    const range = {
      from: startRange,
      to: startRange + interval,
    };
    timefilterUpdateHandler(range);
  };

  const timeZone = getTimezone(uiSettings);

  return (
    <div style={{ width: width ?? '100%' }} data-test-subj="dataVisualizerDocumentCountChart">
      <Chart
        size={{
          width: '100%',
          height: 120,
        }}
      >
        <Settings
          xDomain={xDomain}
          onBrushEnd={onBrushEnd as BrushEndListener}
          onElementClick={onElementClick}
          theme={chartTheme}
          baseTheme={chartBaseTheme}
        />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={(value) => xAxisFormatter.convert(value)}
          timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
          style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
        />
        <Axis id="left" position={Position.Left} />
        <BarSeries
          id={SPEC_ID}
          name={seriesName}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="time"
          yAccessors={['value']}
          data={adjustedChartPoints}
          timeZone={timeZone}
        />
      </Chart>
    </div>
  );
};
