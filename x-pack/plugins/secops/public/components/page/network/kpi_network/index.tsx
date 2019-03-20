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

const fieldTitleMapping = (isLoading: boolean, title: number | null | undefined) => {
  return isLoading ? (
    <EuiLoadingSpinner size="m" />
  ) : title != null ? (
    numeral(title).format('0,0')
  ) : (
    getEmptyTagValue()
  );
};

const cardMapping = (
  isLoading: boolean,
  i18nKey: string,
  data: KpiNetworkData,
  property: string
): React.ReactNode => {
  const matrixTitle: number | null | undefined = get(property, data);
  const matrixDescription: string | undefined = get(i18nKey, i18n);

  return (
    <EuiFlexItem key={matrixDescription}>
      <EuiCard title={fieldTitleMapping(isLoading, matrixTitle)} description={matrixDescription} />
    </EuiFlexItem>
  );
};

const kpiNetworkCards = (loading: boolean, data: KpiNetworkData): React.ReactNode[] => [
  cardMapping(loading, 'NETWORK_EVENTS', data, 'networkEvents'),
  cardMapping(loading, 'UNIQUE_ID', data, 'uniqueFlowId'),
  cardMapping(loading, 'ACTIVE_AGENTS', data, 'activeAgents'),
  cardMapping(loading, 'UNIQUE_PRIVATE_IP', data, 'uniquePrivateIps'),
];

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => (
  <EuiFlexGroup>{kpiNetworkCards(loading, data)}</EuiFlexGroup>
));
