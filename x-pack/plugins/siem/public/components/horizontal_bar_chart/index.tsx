/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { EuiBarSeries, EuiSeriesChart } from '@elastic/eui/lib/experimental';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { LoadingPanel } from '../loading';

import * as i18n from './translations';

export interface HorizontalBarChartData {
  x: number;
  y: string;
}

interface HorizontalBarChartProps {
  barChartdata: HorizontalBarChartData[];
  width?: number;
  height?: number;
  title: string;
  loading: boolean;
}

export const HorizontalBarChart = pure<HorizontalBarChartProps>(
  ({ barChartdata, width, height, title, loading }) => {
    return loading ? (
      <LoadingPanel height="auto" width="100%" text={i18n.LOADING_DATA} />
    ) : (
      <Container height={height}>
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSeriesChart width={width} height={height} yType="ordinal" orientation="horizontal">
          <EuiBarSeries name="Tag counts" data={barChartdata} />
        </EuiSeriesChart>
      </Container>
    );
  }
);

const Container = styled.div<{ height?: number }>`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: auto;
  & > div {
    .rv-xy-plot {
      height: ${({ height }) => (height ? `${height}px !important` : 'auto')};
    }
  }
`;
