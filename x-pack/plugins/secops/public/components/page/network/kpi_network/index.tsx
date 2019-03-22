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
  EuiTextAlign,
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
  title: JSX.Element;
  description: string;
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

const CardItem = pure<CardItemProps>(({ title, description }) => {
  return (
    <EuiFlexItem key={description}>
      <EuiCard title={title} description={description} />
    </EuiFlexItem>
  );
});

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => {
  const kpiNetworkCards = [
    {
      description: get('NETWORK_EVENTS', i18n),
      title: <>{fieldTitleMapping(loading, get('networkEvents', data))}</>,
    },
    {
      property: 'uniqueFlowId',
      description: get('UNIQUE_ID', i18n),
      title: <>{fieldTitleMapping(loading, get('uniqueFlowId', data))}</>,
    },
    {
      property: 'activeAgents',
      description: get('ACTIVE_AGENTS', i18n),
      title: <>{fieldTitleMapping(loading, get('activeAgents', data))}</>,
    },
    {
      property: 'uniquePrivateIps',
      description: get('UNIQUE_PRIVATE_IPS', i18n),
      title: (
        <div>
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {fieldTitleMapping(loading, get('uniqueSourcePrivateIps', data))}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{get('UNIQUE_SOURCE_PRIVATE_IPS', i18n)}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {fieldTitleMapping(loading, get('uniqueDestinationPrivateIps', data))}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{get('UNIQUE_DESTINATION_PRIVATE_IPS', i18n)}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ),
    },
  ];

  return (
    <EuiFlexGroup>
      {kpiNetworkCards.map(card => (
        <CardItem
          key={card.description}
          isLoading={loading}
          description={card.description}
          title={card.title}
        />
      ))}
    </EuiFlexGroup>
  );
});
