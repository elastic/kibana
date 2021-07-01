/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import {
  asMillisecondDuration,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { truncate } from '../../../../utils/style';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { EmptyMessage } from '../../../shared/EmptyMessage';
import { TransactionDetailLink } from '../../../shared/Links/apm/transaction_detail_link';

type TransactionGroup = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups'>['items'][0];

// Truncate both the link and the child span (the tooltip anchor.) The link so
// it doesn't overflow, and the anchor so we get the ellipsis.
const TransactionNameLink = euiStyled(TransactionDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  white-space: nowrap;
  ${truncate('100%')};

  > span {
    ${truncate('100%')};
  }
`;

interface Props {
  items: TransactionGroup[];
  isLoading: boolean;
}

export function TransactionList({ items, isLoading }: Props) {
  const {
    urlParams: { latencyAggregationType },
  } = useUrlParams();
  const columns: Array<ITableColumn<TransactionGroup>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.apm.transactionsTable.nameColumnLabel', {
          defaultMessage: 'Name',
        }),
        width: '50%',
        sortable: true,
        render: (
          _,
          { serviceName, transactionName, transactionType }: TransactionGroup
        ) => {
          return (
            <TransactionNameLink
              serviceName={serviceName}
              transactionName={transactionName}
              transactionType={transactionType}
              latencyAggregationType={latencyAggregationType}
            >
              <EuiToolTip
                id="transaction-name-link-tooltip"
                content={transactionName}
              >
                <>{transactionName}</>
              </EuiToolTip>
            </TransactionNameLink>
          );
        },
      },
      {
        field: 'averageResponseTime',
        name: i18n.translate(
          'xpack.apm.transactionsTable.avgDurationColumnLabel',
          {
            defaultMessage: 'Avg. duration',
          }
        ),
        sortable: true,
        dataType: 'number',
        render: (time: number) => asMillisecondDuration(time),
      },
      {
        field: 'p95',
        name: i18n.translate(
          'xpack.apm.transactionsTable.95thPercentileColumnLabel',
          {
            defaultMessage: '95th percentile',
          }
        ),
        sortable: true,
        dataType: 'number',
        render: (time: number) => asMillisecondDuration(time),
      },
      {
        field: 'transactionsPerMinute',
        name: i18n.translate(
          'xpack.apm.transactionsTable.throughputColumnLabel',
          { defaultMessage: 'Throughput' }
        ),
        sortable: true,
        dataType: 'number',
        render: (value: number) => asTransactionRate(value),
      },
      {
        field: 'impact',
        name: (
          <>
            {i18n.translate('xpack.apm.transactionsTable.impactColumnLabel', {
              defaultMessage: 'Impact',
            })}{' '}
            <EuiIconTip
              size="s"
              type="questionInCircle"
              color="subdued"
              iconProps={{
                className: 'eui-alignTop',
              }}
              content={i18n.translate(
                'xpack.apm.transactionsTable.impactColumnDescription',
                {
                  defaultMessage:
                    'The most used and slowest endpoints in your service. It is the result of multiplying latency and throughput',
                }
              )}
            />
          </>
        ),
        sortable: true,
        dataType: 'number',
        render: (value: number) => <ImpactBar value={value} />,
      },
    ],
    [latencyAggregationType]
  );

  const noItemsMessage = (
    <EmptyMessage
      heading={i18n.translate('xpack.apm.transactionsTable.notFoundLabel', {
        defaultMessage: 'No transactions were found.',
      })}
    />
  );

  return (
    <ManagedTable
      noItemsMessage={isLoading ? <LoadingStatePrompt /> : noItemsMessage}
      columns={columns}
      items={items}
      initialSortField="impact"
      initialSortDirection="desc"
      initialPageSize={25}
    />
  );
}
