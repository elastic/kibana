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
import { CardItem, CardItems, CardItemsComponent } from '../../../card_items';

import * as i18n from './translations';

interface KpiHostsProps {
  data: KpiHostsData;
  loading: boolean;
}

const fieldTitleMapping: Readonly<CardItems[]> = [
  {
    fields: [
      {
        key: 'hosts',
        description: i18n.HOSTS,
        value: null,
      },
    ],
  },
];

export const KpiHostsComponent = pure<KpiHostsProps>(({ data, loading }) => {
  return (
    <EuiFlexGroup>
      {fieldTitleMapping.map(card => (
        <CardItemsComponent
          key={`kpi-hosts-summary-${card.fields[0].description}`}
          isLoading={loading}
          description={card.description}
          fields={addValueToFields(card.fields, data)}
        />
      ))}
    </EuiFlexGroup>
  );
});

const addValueToFields = (fields: CardItem[], data: KpiHostsData): CardItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));
