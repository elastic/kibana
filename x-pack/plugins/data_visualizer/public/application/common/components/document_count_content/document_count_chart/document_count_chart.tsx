/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';

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

export const DocumentCountChart: FC<Props> = ({
  width,
  chartPoints,
  timeRangeEarliest,
  timeRangeLatest,
  interval,
}) => {
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

  const dateFormatter = niceTimeFormatter([timeRangeEarliest, timeRangeLatest]);

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

  return (
    <div style={{ width: width ?? '100%' }} data-test-subj="dataVisualizerDocumentCountChart">
      <Chart
        size={{
          width: '100%',
          height: 120,
        }}
      >
        <Settings xDomain={xDomain} />
        <Axis
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
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
        />
      </Chart>
    </div>
  );
};
