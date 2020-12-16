/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

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
  height?: number;
  chartPoints: DocumentCountChartPoint[];
  timeRangeEarliest: number;
  timeRangeLatest: number;
}

const SPEC_ID = 'document_count';

export const DocumentCountChart: FC<Props> = ({
  width,
  height,
  chartPoints,
  timeRangeEarliest,
  timeRangeLatest,
}) => {
  const seriesName = i18n.translate('xpack.ml.fieldDataCard.documentCountChart.seriesLabel', {
    defaultMessage: 'document count',
  });

  const xDomain = {
    min: timeRangeEarliest,
    max: timeRangeLatest,
  };

  const dateFormatter = niceTimeFormatter([timeRangeEarliest, timeRangeLatest]);

  return (
    <div style={{ width: width ?? '100%' }} data-test-subj="mlFieldDataCardDocumentCountChart">
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
          // Display empty chart when no data in range
          data={chartPoints.length > 0 ? chartPoints : [{ time: timeRangeEarliest, value: 0 }]}
        />
      </Chart>
    </div>
  );
};
