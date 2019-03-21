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

interface CardItemProps {
  isLoading: boolean;
  i18nKey: string;
  data: KpiNetworkData;
  property: string;
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

const CardItem = pure<CardItemProps>(({ isLoading, i18nKey, data, property }) => {
  const matrixTitle: number | null | undefined = get(property, data);
  const matrixDescription: string = get(i18nKey, i18n);

  return (
    <EuiFlexItem key={matrixDescription}>
      <EuiCard title={fieldTitleMapping(isLoading, matrixTitle)} description={matrixDescription} />
    </EuiFlexItem>
  );
});

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => (
  <EuiFlexGroup>
    <CardItem isLoading={loading} i18nKey="NETWORK_EVENTS" data={data} property="networkEvents" />
    <CardItem isLoading={loading} i18nKey="UNIQUE_ID" data={data} property="uniqueFlowId" />
    <CardItem isLoading={loading} i18nKey="ACTIVE_AGENTS" data={data} property="activeAgents" />
    <CardItem
      isLoading={loading}
      i18nKey="UNIQUE_PRIVATE_IP"
      data={data}
      property="uniquePrivateIps"
    />
  </EuiFlexGroup>
));
