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
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import { get, getOr } from 'lodash/fp';
import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { getEmptyTagValue } from '../empty_value';
import { AreaChartData, BarChartData } from '../charts/common';
import { KpiHostsData, KpiNetworkData } from '../../graphql/types';

const FlexItem = styled(EuiFlexItem)`
  min-width: 0;
`;

const StatValue = styled(EuiTitle)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface StatItem {
  key: string;
  description?: string;
  value: number | undefined | null;
  color?: string;
  icon?: IconType;
  name?: string;
}

interface StatItems {
  key: string;
  fields: StatItem[];
  description?: string;
  enableAreaChart?: boolean;
  enableBarChart?: boolean;
  grow?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | true | false | null;
}

export interface StatItemsProps extends StatItems {
  areaChart?: AreaChartData[];
  barChart?: BarChartData[];
}

export const useKpiMatrixStatus = (
  mappings: StatItemsProps[],
  data: KpiHostsData | KpiNetworkData
) => {
  const [statItemsProps, setStatItemsProps] = useState(mappings);

  const addValueToFields = (
    fields: StatItem[],
    kpiHostData: KpiHostsData | KpiNetworkData
  ): StatItem[] => fields.map(field => ({ ...field, value: get(field.key, kpiHostData) }));

  const addValueToAreaChart = (
    fields: StatItem[],
    kpiHostData: KpiHostsData | KpiNetworkData
  ): AreaChartData[] =>
    fields
      .filter(field => get(`${field.key}Histogram`, kpiHostData) != null)
      .map(field => ({
        ...field,
        value: get(`${field.key}Histogram`, kpiHostData),
        key: `${field.key}Histogram`,
      }));

  const addValueToBarChart = (
    fields: StatItem[],
    kpiHostData: KpiHostsData | KpiNetworkData
  ): BarChartData[] => {
    if (fields.length === 0) return [];
    return fields.reduce((acc: BarChartData[], field: StatItem, idx: number) => {
      const key: string = get('key', field);
      const x: number | null = getOr(null, key, kpiHostData);
      const y: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);

      return acc.concat([
        {
          ...field,
          value: [
            {
              x,
              y,
            },
          ],
        },
      ]);
    }, []);
  };
  useEffect(
    () => {
      let temp: StatItemsProps;
      setStatItemsProps(
        mappings.map(stat => {
          temp = {
            ...stat,
            key: `kpi-summary-${stat.key}`,
          };

          if (stat.fields != null)
            temp = {
              ...temp,
              fields: addValueToFields(stat.fields, data),
            };

          if (stat.enableAreaChart)
            temp = {
              ...temp,
              areaChart: addValueToAreaChart(stat.fields, data),
            };

          if (stat.enableBarChart != null)
            temp = {
              ...temp,
              barChart: addValueToBarChart(stat.fields, data),
            };

          return temp;
        })
      );
    },
    [data]
  );

  return statItemsProps;
};

export const StatItemsComponent = React.memo<StatItemsProps>(
  ({ fields, description, grow, barChart, areaChart, enableAreaChart, enableBarChart }) => {
    const isBarChartDataAbailable =
      barChart &&
      barChart.length &&
      barChart.every(item => item.value != null && item.value.length > 0);
    const isAreaChartDataAvailable =
      areaChart &&
      areaChart.length &&
      areaChart.every(item => item.value != null && item.value.length > 0);
    return (
      <FlexItem grow={grow}>
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
