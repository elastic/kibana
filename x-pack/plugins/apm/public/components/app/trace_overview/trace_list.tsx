/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip, RIGHT_ALIGNMENT } from '@elastic/eui';
import { TypeOf } from '@kbn/typed-react-router-config';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ApmRoutes } from '../../routing/apm_route_config';
import {
  asMillisecondDuration,
  asTransactionRate,
} from '../../../../common/utils/formatters';
import { useApmParams } from '../../../hooks/use_apm_params';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { truncate } from '../../../utils/style';
import { EmptyMessage } from '../../shared/empty_message';
import { ImpactBar } from '../../shared/impact_bar';
import { TransactionDetailLink } from '../../shared/links/apm/transaction_detail_link';
import { ITableColumn, ManagedTable } from '../../shared/managed_table';
import { ServiceLink } from '../../shared/service_link';
import { TruncateWithTooltip } from '../../shared/truncate_with_tooltip';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';

type TraceGroup = APIReturnType<'GET /internal/apm/traces'>['items'][0];

const StyledTransactionLink = euiStyled(TransactionDetailLink)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
  ${truncate('100%')};
`;

interface Props {
  items: TraceGroup[];
  isLoading: boolean;
  isFailure: boolean;
}

export function getTraceListColumns({
  query,
}: {
  query: TypeOf<ApmRoutes, '/traces'>['query'];
}): Array<ITableColumn<TraceGroup>> {
  return [
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
        <EuiToolTip
          content={transactionName}
          anchorClassName="eui-textTruncate"
        >
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
      render: (_: string, { serviceName, agentName, transactionType }) => (
        <TruncateWithTooltip
          data-test-subj="apmTraceListAppLink"
          text={serviceName || NOT_AVAILABLE_LABEL}
          content={
            <ServiceLink
              agentName={agentName}
              query={{ ...query, transactionType, serviceGroup: '' }}
              serviceName={serviceName}
            />
          }
        />
      ),
    },
    {
      field: 'averageResponseTime',
      name: i18n.translate('xpack.apm.tracesTable.avgResponseTimeColumnLabel', {
        defaultMessage: 'Latency (avg.)',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { averageResponseTime }) =>
        asMillisecondDuration(averageResponseTime),
    },
    {
      field: 'transactionsPerMinute',
      name: i18n.translate('xpack.apm.tracesTable.tracesPerMinuteColumnLabel', {
        defaultMessage: 'Traces per minute',
      }),
      sortable: true,
      dataType: 'number',
      render: (_, { transactionsPerMinute }) =>
        asTransactionRate(transactionsPerMinute),
    },
    {
      field: 'impact',
      name: (
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.tracesTable.impactColumnDescription',
            {
              defaultMessage:
                'The most used and slowest endpoints in your service. Calculated by multiplying latency by throughput.',
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
      align: RIGHT_ALIGNMENT,
      sortable: true,
      render: (_, { impact }) => <ImpactBar value={impact} />,
    },
  ];
}

const noItemsMessage = (
  <EmptyMessage
    heading={i18n.translate('xpack.apm.tracesTable.notFoundLabel', {
      defaultMessage: 'No traces found for this query',
    })}
  />
);

export function TraceList({ items = [], isLoading, isFailure }: Props) {
  const { query } = useApmParams('/traces');

  const traceListColumns = useMemo(
    () => getTraceListColumns({ query }),
    [query]
  );
  return (
    <ManagedTable
      isLoading={isLoading}
      error={isFailure}
      columns={traceListColumns}
      items={items}
      initialSortField="impact"
      initialSortDirection="desc"
      noItemsMessage={noItemsMessage}
    />
  );
}
