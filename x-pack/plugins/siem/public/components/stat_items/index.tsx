/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiHorizontalRule,
  // @ts-ignore
  EuiStat,
  EuiIcon,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { LoadingPanel } from '../loading';
import { BarChart } from './barchart';
import { AreaChart } from './areachart';

export const WrappedByAutoSizer = styled.div`
  height: 100px;
  position: relative;

  &:hover {
    z-index: 100;
  }
`;

export interface StatItem {
  key: string;
  description?: string;
  value: number | undefined | null;
  color?: string;
  icon: string;
}

export interface AreaChartData {
  key: string;
  value: ChartData[] | null;
  color: string;
}

export interface ChartData {
  x: number;
  y: number | string;
  y0?: number;
}

export interface BarChartData {
  key: string;
  value: ChartData[] | null;
  color: string;
}

export interface StatItems {
  fields: StatItem[];
  description?: string;
  areaChart?: AreaChartData[];
  barChart?: BarChartData[];
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
}

export interface StatItemsProps extends StatItems {
  isLoading: boolean;
  key: string;
}

export const StatItemsComponent = pure<StatItemsProps>(
  ({ fields, description, isLoading, key, grow, barChart, areaChart }) => (
    <FlexItem key={`stat-items-${key}`} grow={grow}>
      <EuiPanel>
        <EuiTitle size="xxxs">
          <h6>{description}</h6>
        </EuiTitle>

        <EuiFlexGroup>
          {fields.map(field => (
            <FlexItem key={`stat-items-field-${field.key}`}>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                <FlexItem grow={false}>
                  <EuiIcon type={field.icon} color={field.color} size="l" />
                </FlexItem>

                <FlexItem>
                  <StatValue>
                    <p>
                      {field.value && field.value.toLocaleString()} {field.description}
                    </p>
                  </StatValue>
                </FlexItem>
              </EuiFlexGroup>
            </FlexItem>
          ))}
        </EuiFlexGroup>

        {areaChart || barChart ? <EuiHorizontalRule margin="s" /> : null}

        {isLoading && (areaChart || barChart) ? (
          <LoadingPanel
            height="auto"
            width="100%"
            text="Loading"
            data-test-subj="InitialLoadingKpisHostsChart"
          />
        ) : (
          <EuiFlexGroup>
            {barChart ? (
              <FlexItem>
                <BarChart barChart={barChart} />
              </FlexItem>
            ) : null}

            {areaChart ? (
              <FlexItem>
                <AreaChart areaChart={areaChart} />
              </FlexItem>
            ) : null}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </FlexItem>
  )
);

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
