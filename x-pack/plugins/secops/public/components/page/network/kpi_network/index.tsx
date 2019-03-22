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
  field: NestedCardItemProps[] | string;
  description: string;
  data?: KpiNetworkData;
}

interface NestedCardItemProps {
  field: string;
  description: string;
  data?: KpiNetworkData;
}

interface CardItemListProps extends CardItemProps {
  isLoading: boolean;
  key: string;
}

const createTitle = (isLoading: boolean, field: string, data: KpiNetworkData) => {
  const title: number = get(field, data);
  return isLoading ? (
    <EuiLoadingSpinner size="m" />
  ) : title != null ? (
    numeral(title).format('0,0')
  ) : (
    getEmptyTagValue()
  );
};

const createMultipleTitles = (
  isLoading: boolean,
  field: NestedCardItemProps[],
  data: KpiNetworkData
) => {
  return (
    <div>
      {field.map(content => {
        const secondaryField: string = get('field', content);
        return (
          <EuiFlexGroup key={content.description} gutterSize="s" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>{createTitle(isLoading, secondaryField, data)}</EuiFlexItem>
            <EuiFlexItem grow={false}>{content.description}</EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </div>
  );
};

const CardItem = pure<CardItemListProps>(({ field, description, isLoading, data }) => {
  return (
    <EuiFlexItem key={description}>
      {
        <EuiCard
          title={
            !Array.isArray(field)
              ? createTitle(isLoading, field, data!)
              : createMultipleTitles(isLoading, field, data!)
          }
          description={description}
        />
      }
    </EuiFlexItem>
  );
});

const fieldTitleMapping: CardItemProps[] = [
  {
    field: 'networkEvents',
    description: i18n.NETWORK_EVENTS,
  },
  {
    field: 'uniqueFlowId',
    description: i18n.UNIQUE_ID,
  },
  {
    field: 'activeAgents',
    description: i18n.ACTIVE_AGENTS,
  },
  {
    field: [
      {
        field: 'uniqueSourcePrivateIps',
        description: i18n.UNIQUE_SOURCE_PRIVATE_IPS,
      },
      {
        field: 'uniqueDestinationPrivateIps',
        description: i18n.UNIQUE_DESTINATION_PRIVATE_IPS,
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
  },
];

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => {
  return (
    <EuiFlexGroup>
      {fieldTitleMapping.map(card => (
        <CardItem
          key={`kpi-summary-${card.description}`}
          isLoading={loading}
          description={card.description}
          field={card.field}
          data={data}
        />
      ))}
    </EuiFlexGroup>
  );
});
