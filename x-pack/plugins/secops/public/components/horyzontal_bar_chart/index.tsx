/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';

import { EuiTitle } from '@elastic/eui';
import {
  // @ts-ignore
  EuiBarSeries,
  // @ts-ignore
  EuiSeriesChart,
} from '@elastic/eui/lib/experimental';

import { LoadingPanel } from '../loading';

export interface HoryzontalBarChartData {
  x: number;
  y: string;
}

interface HoryzontalBarChartProps {
  barChartdata: HoryzontalBarChartData[];
  width?: number;
  height?: number;
  title: string;
  loading: boolean;
}

export const HoryzontalBarChart = pure<HoryzontalBarChartProps>(
  ({ barChartdata, width, height, title, loading }) => {
    return loading ? (
      <LoadingPanel height="100%" width="100%" text="Loading data" />
    ) : (
      <div>
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSeriesChart width={width} height={height} yType="ordinal" orientation="horizontal">
          <EuiBarSeries name="Tag counts" data={barChartdata} />
        </EuiSeriesChart>
      </div>
    );
  }
);
