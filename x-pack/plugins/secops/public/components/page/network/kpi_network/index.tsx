/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { CardItem, CardItems, CardItemsComponent } from '../../../../components/card_items';
import { KpiNetworkData } from '../../../../graphql/types';

import * as i18n from './translations';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const fieldTitleMapping: Readonly<CardItems[]> = [
  {
    fields: [
      {
        key: 'networkEvents',
        description: i18n.NETWORK_EVENTS,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'uniqueFlowId',
        description: i18n.UNIQUE_ID,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'activeAgents',
        description: i18n.ACTIVE_AGENTS,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        description: i18n.UNIQUE_SOURCE_PRIVATE_IPS,
        value: null,
      },
      {
        key: 'uniqueDestinationPrivateIps',
        description: i18n.UNIQUE_DESTINATION_PRIVATE_IPS,
        value: null,
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
  },
];

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => {
  return (
    <EuiFlexGroup>
      {fieldTitleMapping.map((card, idx) => (
        <CardItemsComponent
          key={`kpi-network-summary-${card.description}-${idx}`}
          isLoading={loading}
          description={card.description}
          fields={addValueToFields(card.fields, data)}
        />
      ))}
    </EuiFlexGroup>
  );
});

const addValueToFields = (fields: CardItem[], data: KpiNetworkData): CardItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));
