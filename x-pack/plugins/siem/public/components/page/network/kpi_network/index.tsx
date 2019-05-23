/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { StatItem, StatItems, StatItemsComponent } from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';

import * as i18n from './translations';

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const fieldTitleMapping: Readonly<StatItems[]> = [
  {
    fields: [
      {
        key: 'networkEvents',
        value: null,
      },
    ],
    description: i18n.NETWORK_EVENTS,
  },
  {
    fields: [
      {
        key: 'uniqueFlowId',
        value: null,
      },
    ],
    description: i18n.UNIQUE_ID,
  },
  {
    fields: [
      {
        key: 'activeAgents',
        value: null,
      },
    ],
    description: i18n.ACTIVE_AGENTS,
  },
  {
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
      },
    ],
    description: i18n.UNIQUE_SOURCE_PRIVATE_IPS,
  },
  {
    fields: [
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
      },
    ],
    description: i18n.UNIQUE_DESTINATION_PRIVATE_IPS,
  },
  {
    fields: [
      {
        key: 'dnsQueries',
        value: null,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
  {
    fields: [
      {
        key: 'tlsHandshakes',
        value: null,
      },
    ],
    description: i18n.TLS_HANDSHAKES,
  },
];

const FlexGroup = styled(EuiFlexGroup)`
  margin-height: 86px;
`;

export const KpiNetworkComponent = pure<KpiNetworkProps>(({ data, loading }) => {
  return loading ? (
    <FlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroup>
  ) : (
    <EuiFlexGroup>
      {fieldTitleMapping.map(stat => (
        <StatItemsComponent
          key={`kpi-network-summary-${stat.fields[0].key}`}
          description={stat.description}
          fields={addValueToFields(stat.fields, data)}
        />
      ))}
    </EuiFlexGroup>
  );
});

const addValueToFields = (fields: StatItem[], data: KpiNetworkData): StatItem[] =>
  fields.map(field => ({ ...field, value: get(field.key, data) }));
