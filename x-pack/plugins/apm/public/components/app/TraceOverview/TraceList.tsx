/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { ITransactionGroup } from 'x-pack/plugins/apm/server/lib/transaction_groups/transform';
import { fontSizes, truncate } from '../../../style/variables';
import { asMillis } from '../../../utils/formatters';
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
  noItemsMessage: React.ReactNode;
  isLoading: boolean;
}

const traceListColumns: ITableColumn[] = [
  {
    field: 'name',
    name: i18n.translate('xpack.apm.tracesTable.nameColumnLabel', {
      defaultMessage: 'Name'
    }),
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
    name: i18n.translate(
      'xpack.apm.tracesTable.originatingServiceColumnLabel',
      {
        defaultMessage: 'Originating service'
      }
    ),
    sortable: true
  },
  {
    field: 'averageResponseTime',
    name: i18n.translate('xpack.apm.tracesTable.avgResponseTimeColumnLabel', {
      defaultMessage: 'Avg. response time'
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) => asMillis(value)
  },
  {
    field: 'transactionsPerMinute',
    name: i18n.translate('xpack.apm.tracesTable.tracesPerMinuteColumnLabel', {
      defaultMessage: 'Traces per minute'
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) =>
      `${value.toLocaleString()} ${i18n.translate(
        'xpack.apm.tracesTable.tracesPerMinuteUnitLabel',
        {
          defaultMessage: 'tpm'
        }
      )}`
  },
  {
    field: 'impact',
    name: i18n.translate('xpack.apm.tracesTable.impactColumnLabel', {
      defaultMessage: 'Impact'
    }),
    width: '20%',
    align: 'right',
    sortable: true,
    render: (value: number) => <ImpactBar value={value} />
  }
];

export function TraceList({ items = [], noItemsMessage, isLoading }: Props) {
  const noItems = isLoading ? null : noItemsMessage;
  return (
    <ManagedTable
      columns={traceListColumns}
      items={items}
      initialSort={{ field: 'impact', direction: 'desc' }}
      noItemsMessage={noItems}
      initialPageSize={25}
    />
  );
}
