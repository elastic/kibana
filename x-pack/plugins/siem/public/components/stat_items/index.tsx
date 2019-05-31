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
  EuiIcon,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { getEmptyTagValue } from '../empty_value';
import { AreaChartData, BarChartData } from '../charts/common';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export interface StatItem {
  key: string;
  description?: string;
  value: number | undefined | null;
  color?: string;
  icon?: IconType;
  name?: string;
}

export interface StatItems {
  fields: StatItem[];
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
}

export interface StatItemsProps extends StatItems {
  key: string;
  areaChart?: AreaChartData[];
  barChart?: BarChartData[];
}

export const StatItemsComponent = React.memo<StatItemsProps>(
  ({ fields, description, key, grow, barChart, areaChart, enableAreaChart, enableBarChart }) => {
    const isBarChartDataAbailable =
      barChart &&
      barChart.length &&
      barChart.every(item => item.value != null && item.value.length > 0);
    const isAreaChartDataAvailable =
      areaChart &&
      areaChart.length &&
      areaChart.every(item => item.value != null && item.value.length > 0);
    return (
      <FlexItem key={`stat-items-${key}`} grow={grow}>
        <EuiPanel>
          <EuiTitle size="xxxs">
            <h6>{description}</h6>
          </EuiTitle>

          <EuiFlexGroup>
            {fields.map(field => (
              <FlexItem key={`stat-items-field-${field.key}`}>
                <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
                  {(isAreaChartDataAvailable || isBarChartDataAbailable) && field.icon && (
                    <FlexItem grow={false}>
                      <EuiIcon
                        type={field.icon}
                        color={field.color}
                        size="l"
                        data-test-subj="stat-icon"
                      />
                    </FlexItem>
                  )}

                  <FlexItem>
                    <StatValue>
                      <p data-test-subj="stat-title">
                        {field.value != null ? field.value.toLocaleString() : getEmptyTagValue()}{' '}
                        {field.description}
                      </p>
                    </StatValue>
                  </FlexItem>
                </EuiFlexGroup>
              </FlexItem>
            ))}
          </EuiFlexGroup>

          {(enableAreaChart || enableBarChart) && <EuiHorizontalRule />}

          <EuiFlexGroup>
            {enableBarChart && (
              <FlexItem>
                <BarChart barChart={barChart!} />
              </FlexItem>
            )}

            {enableAreaChart && (
              <FlexItem>
                <AreaChart areaChart={areaChart!} />
              </FlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      </FlexItem>
    );
  }
);
