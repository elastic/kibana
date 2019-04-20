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
import { StatItem, StatItems, StatItemsComponent } from '../../../stat_items';

import * as i18n from './translations';

interface KpiHostsProps {
  data: KpiHostsData;
  loading: boolean;
}

const fieldTitleMapping: StatItems[] = [
  {
    fields: [
      {
        key: 'hosts',
        description: i18n.HOSTS,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'agents',
        description: i18n.AGENTS,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'authentication.success',
        description: i18n.AUTHENTICATION_SUCCESS,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'authentication.failure',
        description: i18n.AUTHENTICATION_FAILURE,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'uniqueSourceIps',
        description: i18n.UNIQUE_SOURCE_IPS,
        value: null,
      },
    ],
  },
  {
    fields: [
      {
        key: 'uniqueDestinationIps',
        description: i18n.UNIQUE_DESTINATION_IPS,
        value: null,
      },
    ],
  },
];

export const KpiHostsComponent = pure<KpiHostsProps>(({ data, loading }) => {
  return (
    <EuiFlexGroup>
      {fieldTitleMapping.map(card => (
        <StatItemsComponent
          key={`kpi-hosts-summary-${card.fields[0].description}`}
          isLoading={loading}
          description={card.description}
          fields={addValueToFields(card.fields, data)}
        />
      ))}
    </EuiFlexGroup>
  );
});

const addValueToFields = (fields: StatItem[], data: KpiHostsData): StatItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));
