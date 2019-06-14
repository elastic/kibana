/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { BarSeries, Chart, getSpecId, ScaleType } from '@elastic/charts';
import { Axes } from '../common/axes';
import { getCustomColor } from '../common/utils';

interface Props {
  eventRateChartData: any[];
  height: string;
  width: string;
  showAxis?: boolean;
}

const SPEC_ID = 'event_rate';
const COLOR = '#006BB4';

export const EventRateChart: FC<Props> = ({ eventRateChartData, height, width, showAxis }) => {
  return (
    <div style={{ width, height }}>
      <Chart>
        {showAxis === true && <Axes />}

        <BarSeries
          id={getSpecId('event_rate')}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'time'}
          yAccessors={['value']}
          data={eventRateChartData}
          customSeriesColors={getCustomColor(SPEC_ID, COLOR)}
        />
      </Chart>
    </div>
  );
};
