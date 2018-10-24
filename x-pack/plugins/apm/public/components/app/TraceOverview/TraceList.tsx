/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { Transaction } from '../../../../typings/Transaction';
import { ITransactionGroup } from '../../../../typings/TransactionGroup';
import { fontSizes, truncate } from '../../../style/variables';
// @ts-ignore
import { asMillisWithDefault } from '../../../utils/formatters';
import { ImpactBar } from '../../shared/ImpactBar';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
// @ts-ignore
import TooltipOverlay from '../../shared/TooltipOverlay';
import { TraceLink } from '../../shared/TraceLink';

function formatString(value: string) {
  return value || 'N/A';
}

const StyledTraceLink = styled(TraceLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

interface Props {
  items: ITransactionGroup[];
  noItemsMessage: any;
}

const traceListColumns: ITableColumn[] = [
  {
    field: 'sample',
    name: 'Name',
    width: '40%',
    sortable: true,
    render: (transaction: Transaction) => (
      <TooltipOverlay content={formatString(transaction.transaction.name)}>
        <StyledTraceLink transaction={transaction}>
          {formatString(transaction.transaction.name)}
        </StyledTraceLink>
      </TooltipOverlay>
    )
  },
  {
    field: 'sample',
    name: 'Originating service',
    sortable: true,
    render: (transaction: Transaction) =>
      formatString(transaction.context.service.name)
  },
  {
    field: 'averageResponseTime',
    name: 'Avg. response time',
    sortable: true,
    dataType: 'number',
    render: (value: number) => asMillisWithDefault(value)
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
