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
  BarSeries,
  timeFormatter,
  niceTimeFormatByDay,
} from '@elastic/charts';
import { formatDate, dateFormatAliases } from '@elastic/eui';
import { dateValueToTuple } from '../index';

const mockData = [
  {
    id: 'storage',
    name: 'Storage',
    data: [
      { date: Date.now(), value: 5 },
      { date: Date.now() + 1000, value: 20 },
      { date: Date.now() + 2000, value: 10 },
      { date: Date.now() + 3000, value: 50 },
      { date: Date.now() + 4000, value: 30 },
      { date: Date.now() + 5000, value: 20 },
      { date: Date.now() + 6000, value: 10 },
      { date: Date.now() + 7000, value: 70 },
      { date: Date.now() + 8000, value: 40 },
    ],
  },
  {
    id: 'iam',
    name: 'IAM',
    data: [
      { date: Date.now(), value: 5 },
      { date: Date.now() + 5000, value: 20 },
    ],
  },
  {
    id: 'network',
    name: 'Network',
    data: [
      { date: Date.now(), value: 5 },
      { date: Date.now() + 2000, value: 20 },
    ],
  },
];

export const FindingsTrendChart = () => {
  const resourcesFindings = mockData;

  return (
    <Chart size={{ height: 200 }}>
      <Settings showLegend={true} legendPosition="right" />
      {resourcesFindings.map((resource) => (
        <BarSeries
          data={resource.data.map(dateValueToTuple)}
          id={resource.id}
          name={resource.name}
          xScaleType="time"
          xAccessor={0}
          yAccessors={[1]}
          stackAccessors={[0]}
        />
      ))}
      <Axis
        title={formatDate(Date.now(), dateFormatAliases.date)}
        id="bottom-axis"
        position="bottom"
        tickFormat={timeFormatter(niceTimeFormatByDay(1))}
      />
      <Axis id="left-axis" position="left" showGridLines tickFormat={(d) => Number(d).toFixed(2)} />
    </Chart>
  );
};
