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
  description: string;
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

const CardItem = pure<CardItemProps>(({ isLoading, description, data, property }) => {
  const matrixTitle: number | null | undefined = get(property, data);

  return (
    <EuiFlexItem key={description}>
      <EuiCard title={fieldTitleMapping(isLoading, matrixTitle)} description={description} />
    </EuiFlexItem>
  );
});

const kpiNetworkCards = [
  {
    property: 'networkEvents',
    description: get('NETWORK_EVENTS', i18n),
  },
  {
    property: 'uniqueFlowId',
    description: get('UNIQUE_ID', i18n),
  },
  {
    property: 'activeAgents',
    description: get('ACTIVE_AGENTS', i18n),
  },
  {
    property: 'uniquePrivateIps',
    description: get('UNIQUE_PRIVATE_IP', i18n),
  },
];

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => (
  <EuiFlexGroup>
    {kpiNetworkCards.map(card => (
      <CardItem
        isLoading={loading}
        description={card.description}
        data={data}
        property={card.property}
      />
    ))}
  </EuiFlexGroup>
));
