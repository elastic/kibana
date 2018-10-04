/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { ITransactionGroup } from '../../../../typings/TransactionGroup';
import { fontSizes, truncate } from '../../../style/variables';
// @ts-ignore
import { asMillisWithDefault } from '../../../utils/formatters';
// @ts-ignore
import { RelativeLink } from '../../../utils/url';
import { ImpactBar } from '../../shared/ImpactBar';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
// @ts-ignore
import TooltipOverlay from '../../shared/TooltipOverlay';

function formatString(value: string) {
  return value || 'N/A';
}

const AppLink = styled(RelativeLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

interface Props {
  items: ITransactionGroup[];
  noItemsMessage: any;
}

const traceListColumns: ITableColumn[] = [
  {
    field: 'name',
    name: 'Name',
    width: '40%',
    sortable: true,
    render: (name: string, { serviceName }: ITransactionGroup) => (
      <TooltipOverlay content={formatString(name)}>
        <AppLink path={`${serviceName}/traces/${name}`}>
          {formatString(name)}
        </AppLink>
      </TooltipOverlay>
    )
  },
  {
    field: 'serviceName',
    name: 'Originating service',
    sortable: true,
    render: (serviceName: string) => formatString(serviceName)
  },
  {
    field: 'averageResponseTime',
    name: 'Avg. response time',
    sortable: true,
    dataType: 'number',
    render: (value: number) => asMillisWithDefault(value * 1000)
  },
  {
    field: 'transactionsPerMinute',
    name: 'Traces per minute',
    sortable: true,
    dataType: 'number',
    render: (value: number) => `${value.toLocaleString()} tpm`
  },
  {
    field: 'impact',
    name: 'Impact',
    width: '20%',
    align: 'right',
    sortable: true,
    render: (value: number) => <ImpactBar value={value} />
  }
];

export function TraceList({ items = [], noItemsMessage, ...rest }: Props) {
  return (
    <ManagedTable
      columns={traceListColumns}
      items={items}
      initialSort={{ field: 'impact', direction: 'desc' }}
      noItemsMessage={noItemsMessage}
      initialPageSize={25}
      {...rest}
    />
  );
}
