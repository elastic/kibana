/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ITransactionGroup } from '../../../../server/lib/transaction_groups/transform';
import { fontSizes, truncate } from '../../../style/variables';
import { asMillisecondDuration } from '../../../utils/formatters';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { ImpactBar } from '../../shared/ImpactBar';
import { TransactionDetailLink } from '../../shared/Links/apm/TransactionDetailLink';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../shared/LoadingStatePrompt';

const StyledTransactionLink = styled(TransactionDetailLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

interface Props {
  items: ITransactionGroup[];
  isLoading: boolean;
}

const traceListColumns: Array<ITableColumn<ITransactionGroup>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.apm.tracesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '40%',
    sortable: true,
    render: (name: string, { sample }: ITransactionGroup) => (
      <EuiToolTip id="trace-transaction-link-tooltip" content={name}>
        <StyledTransactionLink
          serviceName={sample.service.name}
          transactionId={sample.transaction.id}
          traceId={sample.trace.id}
          transactionName={sample.transaction.name}
          transactionType={sample.transaction.type}
        >
          {name}
        </StyledTransactionLink>
      </EuiToolTip>
    ),
  },
  {
    field: 'sample.service.name',
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
      defaultMessage: 'Avg. response time',
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
    render: (value: number) =>
      `${value.toLocaleString()} ${i18n.translate(
        'xpack.apm.tracesTable.tracesPerMinuteUnitLabel',
        {
          defaultMessage: 'tpm',
        }
      )}`,
  },
  {
    field: 'impact',
    name: (
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.tracesTable.impactColumnDescription',
          {
            defaultMessage:
              "The most used and slowest endpoints in your service. It's calculated by taking the relative average duration times the number of transactions per minute.",
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
