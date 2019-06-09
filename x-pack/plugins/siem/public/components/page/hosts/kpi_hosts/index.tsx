/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { KpiHostsData } from '../../../../graphql/types';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
  StatItems,
} from '../../../stat_items';
import * as i18n from './translations';

const kpiWidgetHeight = 247;

const euiColorVis0 = '#00B3A4';
const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

interface KpiHostsProps {
  data: KpiHostsData;
  loading: boolean;
}

const fieldTitleMapping: Readonly<StatItems[]> = [
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
    min-height: ${kpiWidgetHeight}px;
  }
`;

export const KpiHostsComponent = ({ data, loading }: KpiHostsProps) => {
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
};
