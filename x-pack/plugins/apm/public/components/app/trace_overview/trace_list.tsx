/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import {
  asMillisecondDuration,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { truncate } from '../../../utils/style';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { ImpactBar } from '../../shared/ImpactBar';
import { TransactionDetailLink } from '../../shared/Links/apm/transaction_detail_link';
import { LoadingStatePrompt } from '../../shared/LoadingStatePrompt';
import { ITableColumn, ManagedTable } from '../../shared/managed_table';

type TraceGroup = APIReturnType<'GET /api/apm/traces'>['items'][0];

const StyledTransactionLink = euiStyled(TransactionDetailLink)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeM};
  ${truncate('100%')};
`;

interface Props {
  items: TraceGroup[];
  isLoading: boolean;
}

const traceListColumns: Array<ITableColumn<TraceGroup>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.apm.tracesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '40%',
    sortable: true,
    render: (
      _: string,
      { serviceName, transactionName, transactionType }: TraceGroup
    ) => (
      <EuiToolTip content={transactionName} anchorClassName="eui-textTruncate">
        <StyledTransactionLink
          serviceName={serviceName}
          transactionName={transactionName}
          transactionType={transactionType}
        >
          {transactionName}
        </StyledTransactionLink>
      </EuiToolTip>
    ),
  },
  {
    field: 'serviceName',
    name: i18n.translate(
      'xpack.apm.tracesTable.originatingServiceColumnLabel',
      {
        defaultMessage: 'Originating service',
      }
    ),
    sortable: true,
  },
  {
    field: 'averageResponseTime',
    name: i18n.translate('xpack.apm.tracesTable.avgResponseTimeColumnLabel', {
      defaultMessage: 'Latency (avg.)',
    }),
    sortable: true,
    dataType: 'number',
    render: (time: number) => asMillisecondDuration(time),
  },
  {
    field: 'transactionsPerMinute',
    name: i18n.translate('xpack.apm.tracesTable.tracesPerMinuteColumnLabel', {
      defaultMessage: 'Traces per minute',
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) => asTransactionRate(value),
  },
  {
    field: 'impact',
    name: (
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.tracesTable.impactColumnDescription',
          {
            defaultMessage:
              'The most used and slowest endpoints in your service. It is the result of multiplying latency and throughput',
          }
        )}
      >
        <>
          {i18n.translate('xpack.apm.tracesTable.impactColumnLabel', {
            defaultMessage: 'Impact',
          })}{' '}
          <EuiIcon
            size="s"
            color="subdued"
            type="questionInCircle"
            className="eui-alignTop"
          />
        </>
      </EuiToolTip>
    ),
    width: '20%',
    align: 'left',
    sortable: true,
    render: (value: number) => <ImpactBar value={value} />,
  },
];

const noItemsMessage = (
  <EmptyMessage
    heading={i18n.translate('xpack.apm.tracesTable.notFoundLabel', {
      defaultMessage: 'No traces found for this query',
    })}
  />
);

export function TraceList({ items = [], isLoading }: Props) {
  const noItems = isLoading ? <LoadingStatePrompt /> : noItemsMessage;
  return (
    <ManagedTable
      columns={traceListColumns}
      items={items}
      initialSortField="impact"
      initialSortDirection="desc"
      noItemsMessage={noItems}
      initialPageSize={25}
    />
  );
}
