/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { KpiHostsData } from '../../../../graphql/types';
import {
  AreaChartData,
  BarChartData,
  StatItem,
  StatItems,
  StatItemsComponent,
  StatItemsProps,
} from '../../../stat_items';
import * as i18n from './translations';

interface KpiHostsProps {
  data: KpiHostsData;
  loading: boolean;
}

const euiColorVis0 = '#00B3A4';
const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

const fieldTitleMapping: StatItems[] = [
  {
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

export const KpiHostsComponent = pure<KpiHostsProps>(({ data, loading }) => {
  return loading ? (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 247 }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup>
      {fieldTitleMapping.map(stat => {
        let statItemProps: StatItemsProps = {
          ...stat,
          key: `kpi-hosts-summary-${stat.description}`,
        };

        if (stat.fields != null)
          statItemProps = {
            ...statItemProps,
            fields: addValueToFields(stat.fields, data),
          };

        if (stat.enableAreaChart)
          statItemProps = {
            ...statItemProps,
            areaChart: addValueToAreaChart(stat.fields, data),
          };

        if (stat.enableBarChart != null)
          statItemProps = {
            ...statItemProps,
            barChart: addValueToBarChart(stat.fields, data),
          };

        return <StatItemsComponent {...statItemProps} />;
      })}
    </EuiFlexGroup>
  );
});

const addValueToFields = (fields: StatItem[], data: KpiHostsData): StatItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));

const addValueToAreaChart = (fields: StatItem[], data: KpiHostsData): AreaChartData[] =>
  fields
    .filter(field => get(`${field.key}Histogram`, data) != null)
    .map(field => ({
      ...field,
      value: get(`${field.key}Histogram`, data),
      key: `${field.key}Histogram`,
    }));

const addValueToBarChart = (fields: StatItem[], data: KpiHostsData): BarChartData[] => {
  if (fields.length === 0) return [];
  return fields.reduce((acc: BarChartData[], field: StatItem, idx: number) => {
    const key: string = get('key', field);
    const x: number | null = getOr(null, key, data);
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
