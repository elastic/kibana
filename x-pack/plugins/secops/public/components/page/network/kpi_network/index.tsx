/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { get } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { KpiNetworkData } from '../../../../graphql/types';
import { getEmptyTagValue } from '../../../empty_value';

import * as i18n from './translations';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const loadMatrix = (loading: boolean, data: KpiNetworkData, property: string) => {
  const matrix = get(property, data);

  if (typeof matrix !== 'undefined' && matrix !== null) {
    return numeral(matrix).format('0,0');
  } else {
    if (loading) {
      return <EuiLoadingSpinner size="m" />;
    } else {
      getEmptyTagValue();
    }
  }
};

const kpiNetworkCards = (loading: boolean, data: KpiNetworkData) => [
  {
    title: loadMatrix(loading, data, 'networkEvents'),
    description: i18n.NETWORK_EVENTS,
  },
  {
    title: loadMatrix(loading, data, 'uniqueFlowId'),
    description: i18n.UNIQUE_ID,
  },
  {
    title: loadMatrix(loading, data, 'activeAgents'),
    description: i18n.ACTIVE_AGENTS,
  },
  {
    title: loadMatrix(loading, data, 'uniquePrivateIps'),
    description: i18n.UNIQUE_PRIVATE_IP,
  },
];
export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => (
  <EuiFlexGroup>
    {kpiNetworkCards(loading, data).map(item => (
      <EuiFlexItem key={item.description}>
        <EuiCard title={item.title} description={item.description} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
));
