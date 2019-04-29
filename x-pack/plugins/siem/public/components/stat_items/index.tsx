/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiHorizontalRule,
  // @ts-ignore
  EuiStat,
  EuiIcon,
} from '@elastic/eui';

const iconType = 'stopFilled';
import numeral from '@elastic/numeral';
import React from 'react';
import { pure } from 'recompose';

import { EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { getEmptyTagValue } from '../empty_value';
import { LoadingPanel } from '../loading';
import { BarChart } from './barchart';
import { AreaChart } from './areachart';

export const WrappedByAutoSizer = styled.div`
  height: 100px;
  position: relative;
`;

export const ChartOverlay = styled.div`
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  position: absolute;
`;

export interface StatItem {
  key: string;
  description?: string;
  value: number | undefined | null;
  color?: string;
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

const StatTitle = pure<{ isLoading: boolean; value: number | null | undefined }>(
  ({ isLoading, value }) => (
    <span>
      {isLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : value != null ? (
        numeral(value).format('0,0')
      ) : (
        getEmptyTagValue()
      )}
    </span>
  )
);

const getChartSpan = (
  barChart: BarChartData[] | undefined | null,
  areaChart: AreaChartData[] | undefined | null
) => {
  return barChart && barChart.length && areaChart && areaChart.length ? 5 : 10;
};

export const StatItemsComponent = pure<StatItemsProps>(
  ({ fields, description, isLoading, key, grow, barChart, areaChart }) => (
    <EuiFlexItem key={`stat-items-${key}`} grow={grow}>
      <EuiPanel>
        <EuiStat
          description={
            <EuiTitle size="xxs">
              <span>{description}</span>
            </EuiTitle>
          }
          titleSize="m"
          title={
            <EuiFlexGroup justifyContent="spaceBetween" component="span">
              {fields.map(field => (
                <EuiFlexItem component="span" key={`stat-items-field-${field.key}`}>
                  <EuiFlexGroup
                    justifyContent="spaceBetween"
                    component="span"
                    gutterSize="m"
                    alignItems="center"
                    data-test-subj="stat-title"
                  >
                    <EuiFlexItem component="span" grow={2}>
                      <EuiFlexGroup component="span" gutterSize="m" alignItems="center">
                        {field.color ? (
                          <EuiFlexItem component="span">
                            <EuiIcon type={iconType} color={field.color} size="xl" />
                          </EuiFlexItem>
                        ) : null}
                        <EuiFlexItem component="span">
                          <StatTitle isLoading={isLoading} value={field.value} />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem component="span" grow={4}>
                      {field.description}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          }
        />
        {areaChart || barChart ? <EuiHorizontalRule /> : null}
        {isLoading && (areaChart || barChart) ? (
          <LoadingPanel
            height="auto"
            width="100%"
            text="Loading"
            data-test-subj="InitialLoadingKpisHostsChart"
          />
        ) : (
          <EuiFlexGroup gutterSize="none">
            {barChart ? (
              <EuiFlexItem grow={getChartSpan(barChart, areaChart)}>
                <BarChart barChart={barChart} />
              </EuiFlexItem>
            ) : null}
            {areaChart ? (
              <EuiFlexItem grow={getChartSpan(barChart, areaChart)}>
                <AreaChart areaChart={areaChart} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </EuiFlexItem>
  )
);
