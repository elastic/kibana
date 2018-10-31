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
import { ImpactBar } from '../../shared/ImpactBar';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
// @ts-ignore
import TooltipOverlay from '../../shared/TooltipOverlay';
import { TransactionLink } from '../../shared/TransactionLink';

const StyledTransactionLink = styled(TransactionLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

interface Props {
  items: ITransactionGroup[];
  noItemsMessage: any;
  isLoading: boolean;
}

const traceListColumns: ITableColumn[] = [
  {
    field: 'name',
    name: 'Name',
    width: '40%',
    sortable: true,
    render: (name, group: ITransactionGroup) => (
      <TooltipOverlay content={name}>
        <StyledTransactionLink transaction={group.sample}>
          {name}
        </StyledTransactionLink>
      </TooltipOverlay>
    )
  },
  {
    field: 'sample.context.service.name',
    name: 'Originating service',
    sortable: true
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

export function TraceList({ items = [], noItemsMessage, isLoading }: Props) {
  return isLoading ? null : (
    <ManagedTable
      columns={traceListColumns}
      items={items}
      initialSort={{ field: 'impact', direction: 'desc' }}
      noItemsMessage={noItemsMessage}
      initialPageSize={25}
    />
  );
}
