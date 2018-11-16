/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { IServiceListItem } from 'x-pack/plugins/apm/server/lib/services/get_services';
import { fontSizes, truncate } from '../../../../style/variables';
import { asDecimal, asMillis } from '../../../../utils/formatters';
import { RelativeLink } from '../../../../utils/url';
import { ManagedTable } from '../../../shared/ManagedTable';

interface Props {
  items: IServiceListItem[];
  noItemsMessage?: React.ReactNode;
}

function formatNumber(value: number) {
  if (value === 0) {
    return '0';
  } else if (value <= 0.1) {
    return '< 0.1';
  } else {
    return asDecimal(value);
  }
}

function formatString(value?: string | null) {
  return value || 'N/A';
}

const AppLink = styled(RelativeLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

export const SERVICE_COLUMNS = [
  {
    field: 'serviceName',
    name: 'Name',
    width: '50%',
    sortable: true,
    render: (serviceName: string) => (
      <EuiToolTip content={formatString(serviceName)} id="service-name-tooltip">
        <AppLink path={`/${serviceName}/transactions`}>
          {formatString(serviceName)}
        </AppLink>
      </EuiToolTip>
    )
  },
  {
    field: 'agentName',
    name: 'Agent',
    sortable: true,
    render: (agentName: string) => formatString(agentName)
  },
  {
    field: 'avgResponseTime',
    name: 'Avg. response time',
    sortable: true,
    dataType: 'number',
    render: (value: number) => asMillis(value)
  },
  {
    field: 'transactionsPerMinute',
    name: 'Trans. per minute',
    sortable: true,
    dataType: 'number',
    render: (value: number) => `${formatNumber(value)} tpm`
  },
  {
    field: 'errorsPerMinute',
    name: 'Errors per minute',
    sortable: true,
    dataType: 'number',
    render: (value: number) => `${formatNumber(value)} err.`
  }
];

export function ServiceList({ items = [], noItemsMessage }: Props) {
  return (
    <ManagedTable
      columns={SERVICE_COLUMNS}
      items={items}
      noItemsMessage={noItemsMessage}
      initialSort={{ field: 'serviceName', direction: 'asc' }}
    />
  );
}
