/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React, { useState, useEffect } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { KpiHostsData } from '../../../../graphql/types';
import { StatItem, StatItemsComponent, StatItemsProps } from '../../../stat_items';
import * as i18n from './translations';
import { AreaChartData, BarChartData } from '../../../charts/common';

interface KpiHostsProps {
  data: KpiHostsData;
  loading: boolean;
}

const euiColorVis0 = '#00B3A4';
const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

const fieldTitleMapping: StatItemsProps[] = [
  {
    key: 'hosts',
    fields: [
      {
        key: 'hosts',
        value: null,
        color: euiColorVis1,
        icon: 'storage',
      },
    ],
    enableAreaChart: true,
    grow: 2,
    description: i18n.HOSTS,
  },
  {
    key: 'authentication',
    fields: [
      {
        key: 'authSuccess',
        description: i18n.AUTHENTICATION_SUCCESS,
        value: null,
        color: euiColorVis0,
        icon: 'check',
      },
      {
        key: 'authFailure',
        description: i18n.AUTHENTICATION_FAILURE,
        value: null,
        color: euiColorVis9,
        icon: 'cross',
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 4,
    description: i18n.AUTHENTICATION,
  },
  {
    key: 'uniqueIps',
    fields: [
      {
        key: 'uniqueSourceIps',
        name: i18n.UNIQUE_SOURCE_IPS_ABBREVIATION,
        description: i18n.UNIQUE_SOURCE_IPS,
        value: null,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationIps',
        description: i18n.UNIQUE_DESTINATION_IPS,
        value: null,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 4,
    description: i18n.UNIQUE_IPS,
  },
];

const FlexGroupSpinner = styled(EuiFlexGroup)`
   {
    min-height: 247;
  }
`;

export const useKpiMatrixStatus = (mappings: StatItemsProps[], data: KpiHostsData) => {
  const [statItemsProps, setStatItemsProps] = useState(mappings);

  const addValueToFields = (fields: StatItem[], kpiHostData: KpiHostsData): StatItem[] =>
    fields.map(field => ({ ...field, value: get(field.key, kpiHostData) }));

  const addValueToAreaChart = (fields: StatItem[], kpiHostData: KpiHostsData): AreaChartData[] =>
    fields
      .filter(field => get(`${field.key}Histogram`, kpiHostData) != null)
      .map(field => ({
        ...field,
        value: get(`${field.key}Histogram`, kpiHostData),
        key: `${field.key}Histogram`,
      }));

  const addValueToBarChart = (fields: StatItem[], kpiHostData: KpiHostsData): BarChartData[] => {
    if (fields.length === 0) return [];
    return fields.reduce((acc: BarChartData[], field: StatItem, idx: number) => {
      const key: string = get('key', field);
      const y: number | null = getOr(null, key, kpiHostData);
      const x: string = get(`${idx}.name`, fields) || getOr('', `${idx}.description`, fields);

      return acc.concat([
        {
          ...field,
          value: [
            {
              x,
              y,
              g: key,
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
            key: `kpi-hosts-summary-${stat.key}`,
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

export const KpiHostsComponent = React.memo<KpiHostsProps>(({ data, loading }) => {
  const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(fieldTitleMapping, data);
  return loading ? (
    <FlexGroupSpinner justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroupSpinner>
  ) : (
    <EuiFlexGroup>
      {statItemsProps.map(mappedStatItemProps => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
});
