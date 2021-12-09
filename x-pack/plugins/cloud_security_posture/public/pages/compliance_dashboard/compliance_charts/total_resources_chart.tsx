/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Chart,
  Settings,
  Axis,
  AreaSeries,
  timeFormatter,
  niceTimeFormatByDay,
} from '@elastic/charts';
import { formatDate, dateFormatAliases } from '@elastic/eui';
import { dateValueToTuple } from '../index';

const mock = [
  {
    id: 'resources',
    name: 'Resources',
    data: [
      { date: Date.now(), value: 5 },
      { date: Date.now() + 1000, value: 11 },
      { date: Date.now() + 2000, value: 49 },
      { date: Date.now() + 3000, value: 74 },
      { date: Date.now() + 4000, value: 101 },
    ],
  },
  {
    id: 'passed',
    name: 'Passed',
    data: [
      { date: Date.now(), value: 4 },
      { date: Date.now() + 1000, value: 3 },
      { date: Date.now() + 2000, value: 30 },
      { date: Date.now() + 3000, value: 64 },
      { date: Date.now() + 4000, value: 99 },
    ],
  },
  {
    id: 'failed',
    name: 'Failed',
    data: [
      { date: Date.now(), value: 1 },
      { date: Date.now() + 1000, value: 8 },
      { date: Date.now() + 2000, value: 19 },
      { date: Date.now() + 3000, value: 10 },
      { date: Date.now() + 4000, value: 3 },
    ],
  },
];

export const TotalResourcesChart = () => {
  const totalResourcesCompliance = mock;

  return (
    <Chart size={{ height: 200 }}>
      <Settings
        // theme={isDarkTheme ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme}
        showLegend={true}
        legendPosition="right"
      />

      {totalResourcesCompliance.map((resource) => (
        <AreaSeries
          id={resource.id}
          name={resource.name}
          data={resource.data.map(dateValueToTuple)}
          xScaleType="time"
          xAccessor={0}
          yAccessors={[1]}
        />
      ))}

      <Axis
        title={formatDate(Date.now(), dateFormatAliases.date)}
        id="bottom-axis"
        position="bottom"
        tickFormat={timeFormatter(niceTimeFormatByDay(1))}
        showGridLines
      />
      <Axis id="left-axis" position="left" showGridLines tickFormat={(d) => Number(d).toFixed(2)} />
    </Chart>
  );
};
