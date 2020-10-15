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
import { TransactionGroup } from '../../../../server/lib/transaction_groups/fetcher';
import { DateBucketUnit } from '../../../../common/utils/get_date_bucket_options';
import { asMillisecondDuration } from '../../../../common/utils/formatters';
import { fontSizes, truncate } from '../../../style/variables';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { ImpactBar } from '../../shared/ImpactBar';
import { ITableColumn, ManagedTable } from '../../shared/ManagedTable';
import { LoadingStatePrompt } from '../../shared/LoadingStatePrompt';
import { TransactionDetailLink } from '../../shared/Links/apm/TransactionDetailLink';
import { useDateBucketOptions } from '../../../hooks/use_date_bucket_options';

const StyledTransactionLink = styled(TransactionDetailLink)`
  font-size: ${fontSizes.large};
  ${truncate('100%')};
`;

interface Props {
  items: TransactionGroup[];
  isLoading: boolean;
}

const getTraceListColumns = (
  unit: DateBucketUnit
): Array<ITableColumn<TransactionGroup>> => [
  {
    field: 'name',
    name: i18n.translate('xpack.apm.tracesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '40%',
    sortable: true,
    render: (
      _: string,
      { serviceName, transactionName, transactionType }: TransactionGroup
    ) => (
      <EuiToolTip content={transactionName}>
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
      defaultMessage: 'Avg. response time',
    }),
    sortable: true,
    dataType: 'number',
    render: (time: number) => asMillisecondDuration(time),
  },
  {
    field: 'transactionRate',
    name: i18n.translate('xpack.apm.tracesTable.traceRateColumnLabel', {
      defaultMessage:
        'Traces per {unit, select, minute {minute} second {second}}',
      values: {
        unit,
      },
    }),
    sortable: true,
    dataType: 'number',
    render: (value: number) =>
      `${value.toLocaleString()} ${i18n.translate(
        'xpack.apm.tracesTable.traceRateUnitLabel',
        {
          defaultMessage: 'tp{unit, select, minute {m} second {s}}',
          values: {
            unit,
          },
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
              "The most used and slowest endpoints in your service. It's calculated by taking the relative average duration times the number of transaction rate.",
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
  const { unit } = useDateBucketOptions();

  return (
    <ManagedTable
      columns={getTraceListColumns(unit)}
      items={items}
      initialSortField="impact"
      initialSortDirection="desc"
      noItemsMessage={noItems}
      initialPageSize={25}
    />
  );
}
