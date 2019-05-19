/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiText, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const FlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export const ChartHolder = () => (
  <FlexGroup justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiText size="s" textAlign="center" color="subdued">
        Chart Data Not Available
      </EuiText>
    </EuiFlexItem>
  </FlexGroup>
);

export interface AreaChartData {
  key: string;
  value: ChartData[] | [] | null;
  color?: string | undefined;
}

export interface ChartData {
  x: number | string | null;
  y: number | string | null;
  y0?: number;
}

export interface BarChartData {
  key: string;
  value: [ChartData] | [] | null;
  color?: string | undefined;
}

export const WrappedByAutoSizer = styled.div`
  height: 100px;
  position: relative;

  &:hover {
    z-index: 100;
  }
`;

export const numberFormatter = (value: string | number) => {
  return value.toLocaleString && value.toLocaleString();
};
