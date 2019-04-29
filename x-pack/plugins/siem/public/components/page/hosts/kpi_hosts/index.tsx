/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
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
      },
    ],
    areaChart: [
      {
        key: 'hostsHistogram',
        value: null,
        color: euiColorVis1,
      },
    ],
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
      },
      {
        key: 'authFailure',
        description: i18n.AUTHENTICATION_FAILURE,
        value: null,
        color: euiColorVis9,
      },
    ],
    areaChart: [
      {
        key: 'authSuccessHistogram',
        value: null,
        color: euiColorVis0,
      },
      {
        key: 'authFailureHistogram',
        value: null,
        color: euiColorVis9,
      },
    ],
    barChart: [
      {
        key: 'authSuccess',
        value: null,
        color: euiColorVis0,
      },
      {
        key: 'authFailure',
        value: null,
        color: euiColorVis9,
      },
    ],
    grow: 4,
    description: i18n.AUTHENTICATION,
  },
  {
    fields: [
      {
        key: 'uniqueSourceIps',
        description: i18n.UNIQUE_SOURCE_IPS,
        value: null,
        color: euiColorVis2,
      },
      {
        key: 'uniqueDestinationIps',
        description: i18n.UNIQUE_DESTINATION_IPS,
        value: null,
        color: euiColorVis3,
      },
    ],
    areaChart: [
      {
        key: 'uniqueSourceIpsHistogram',
        value: null,
        color: euiColorVis2,
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: null,
        color: euiColorVis3,
      },
    ],
    barChart: [
      {
        key: 'uniqueSourceIps',
        value: null,
        color: euiColorVis2,
      },
      {
        key: 'uniqueDestinationIps',
        value: null,
        color: euiColorVis3,
      },
    ],
    grow: 4,
    description: i18n.UNIQUE_PRIVATE_IPS,
  },
];

export const KpiHostsComponent = pure<KpiHostsProps>(({ data, loading }) => {
  return (
    <EuiFlexGroup>
      {fieldTitleMapping.map(card => {
        let statItemProps: StatItemsProps = {
          ...card,
          isLoading: loading,
          key: `kpi-hosts-summary-${card.description}`,
        };

        if (card.fields != null)
          statItemProps = {
            ...statItemProps,
            fields: addValueToFields(card.fields, data),
          };

        if (card.areaChart != null)
          statItemProps = {
            ...statItemProps,
            areaChart: addValueToChart(card.areaChart, data),
          };

        if (card.barChart != null)
          statItemProps = {
            ...statItemProps,
            barChart: addValueToBarChart(card.barChart, data),
          };

        return <StatItemsComponent {...statItemProps} />;
      })}
    </EuiFlexGroup>
  );
});

const addValueToFields = (fields: StatItem[], data: KpiHostsData): StatItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));

const addValueToChart = (fields: AreaChartData[], data: KpiHostsData): AreaChartData[] =>
  fields
    .filter(field => get(field.key, data) != null)
    .map(field => ({ ...field, value: get(field.key, data) }));

const addValueToBarChart = (fields: BarChartData[], data: KpiHostsData): BarChartData[] => {
  return fields
    .filter(field => get(field.key, data) != null)
    .map(field => {
      return {
        ...field,
        value: [
          {
            x: get(field.key, data),
            y: field.key,
          },
        ],
      };
    });
};
