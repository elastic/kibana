/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rgba } from 'polished';
import React from 'react';
// @ts-ignore
import CustomPlot from 'x-pack/plugins/apm/public/components/shared/charts/CustomPlot';
import { SyncChartGroup } from 'x-pack/plugins/apm/public/components/shared/charts/SyncChartGroup';
import { colors } from '../../../style/variables';

function rand(places = 2) {
  return Number(
    (Math.random() * Math.floor(Math.random() * 200)).toFixed(places)
  );
}

function increase(num) {
  return num + rand();
}

function createStack(nItems, last) {
  const baseline = { x: 0, y: 0 };
  return Array(nItems)
    .fill()
    .map((_, i) => {
      const current = last && last[i] ? last[i] : baseline;
      return { x: i, y: increase(current.y) };
    });
}

function generateStackedData(nSeries, nItems) {
  const stacks = [];
  for (let i = 0; i < nSeries; i++) {
    stacks.push(createStack(nItems, i >= 0 ? stacks[i - 1] : []));
  }
  return stacks;
}

//   colors.apmBlue
//   colors.apmPurple
//   colors.apmPink
//   colors.apmTan
//   colors.apmRed
//   colors.apmBrown

const meta = [
  {
    color: colors.apmBlue,
    legendValue: '2.4 GB',
    title: 'Process mem. size',
    type: 'area'
  },
  {
    color: colors.apmGreen,
    legendValue: '4.1 GB',
    title: 'Process RSS',
    type: 'area'
  },
  {
    color: colors.apmPurple,
    legendValue: '24.3 GB',
    title: 'System avail. mem.',
    type: 'area'
  },
  {
    color: colors.apmPink,
    legendValue: '99.8 GB',
    title: 'System total mem.',
    type: 'area'
  }
];

const fakeSeries = generateStackedData(4, 50).map((data, i) => ({
  data,
  ...meta[i]
}));

window._jason_ = { fakeSeries };

export function MemoryUsageChart() {
  return (
    <SyncChartGroup
      render={syncProps => <CustomPlot {...syncProps} series={fakeSeries} />}
    />
  );
}
