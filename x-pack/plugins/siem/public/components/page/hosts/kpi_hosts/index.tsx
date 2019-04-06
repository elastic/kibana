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

const rowsMapping: CardItems[][] = [
  [
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
          key: 'installedPackages',
          description: i18n.INSTALLED_PACKAGES,
          value: null,
        },
      ],
    },
    {
      fields: [
        {
          key: 'processCount',
          description: i18n.PROCESS_COUNT,
          value: null,
        },
      ],
    },
    {
      fields: [
        {
          key: 'authenticationAttempts',
          description: i18n.AUTHENTICATION_ATTEMPTS,
          value: null,
        },
      ],
    },
    {
      fields: [
        {
          key: 'auditbeatEvents',
          description: i18n.AUDITBEAT_EVENTS,
          value: null,
        },
      ],
    },
  ],
  [
    {
      fields: [
        {
          key: 'winlogbeatEvents',
          description: i18n.WINLOGBEAT_EVENTS,
          value: null,
        },
      ],
    },
    {
      fields: [
        {
          key: 'filebeatEvents',
          description: i18n.FILEBEAT_EVENTS,
          value: null,
        },
      ],
    },
    {
      fields: [
        {
          key: 'sockets',
          description: i18n.SOCKETS,
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
  ],
];

export const KpiHostsComponent = pure<KpiHostsProps>(({ data, loading }) => {
  return (
    <>
      {rowsMapping.map((fieldTitleMapping, rowId) => (
        <EuiFlexGroup key={`kpi-hosts-summary-row-${rowId}`}>
          {fieldTitleMapping.map(card => (
            <CardItemsComponent
              key={`kpi-hosts-summary-${card.fields[0].description}`}
              isLoading={loading}
              description={card.description}
              fields={addValueToFields(card.fields, data)}
            />
          ))}
        </EuiFlexGroup>
      ))}
    </>
  );
});

const addValueToFields = (fields: CardItem[], data: KpiHostsData): CardItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));
