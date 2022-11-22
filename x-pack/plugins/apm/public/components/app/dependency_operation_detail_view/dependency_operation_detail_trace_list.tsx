/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiRadio,
  EuiText,
  EuiTitle,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { ValuesType } from 'utility-types';
import { EventOutcome } from '../../../../common/event_outcome';
import { asMillisecondDuration } from '../../../../common/utils/formatters';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FetcherResult, FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { push } from '../../shared/links/url_helpers';
import {
  ITableColumn,
  ManagedTable,
  SortFunction,
} from '../../shared/managed_table';
import { ServiceLink } from '../../shared/service_link';
import { TimestampTooltip } from '../../shared/timestamp_tooltip';

type DependencySpan = ValuesType<
  APIReturnType<'GET /internal/apm/dependencies/operations/spans'>['spans']
>;

export function DependencyOperationDetailTraceList({
  spanFetch,
  sortFn,
}: {
  spanFetch: FetcherResult<
    APIReturnType<'GET /internal/apm/dependencies/operations/spans'>
  >;
  sortFn: SortFunction<DependencySpan>;
}) {
  const router = useApmRouter();

  const history = useHistory();

  const theme = useTheme();

  const {
    query: {
      comparisonEnabled,
      environment,
      offset,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      kuery,
      sortField = '@timestamp',
      sortDirection = 'desc',
      pageSize = 10,
      page = 1,
      spanId,
    },
  } = useApmParams('/dependencies/operation');

  function getTraceLink({
    transactionName,
    transactionType,
    traceId,
    transactionId,
    serviceName,
  }: {
    serviceName: string;
    transactionName?: string;
    transactionType?: string;
    traceId: string;
    transactionId?: string;
  }) {
    const href = transactionName
      ? router.link('/services/{serviceName}/transactions/view', {
          path: { serviceName },
          query: {
            comparisonEnabled,
            environment,
            kuery,
            rangeFrom,
            rangeTo,
            serviceGroup: '',
            transactionName,
            refreshInterval,
            refreshPaused,
            offset,
            traceId,
            transactionId,
            transactionType,
            showCriticalPath: false,
          },
        })
      : router.link('/link-to/trace/{traceId}', {
          path: {
            traceId,
          },
          query: {
            rangeFrom,
            rangeTo,
          },
        });

    return href;
  }

  const columns: Array<ITableColumn<DependencySpan>> = [
    {
      name: '',
      field: 'spanId',
      render: (_, { spanId: itemSpanId }) => {
        return (
          <EuiRadio
            id={itemSpanId}
            onChange={(value) => {
              push(history, {
                query: { spanId: value ? itemSpanId : '' },
              });
            }}
            checked={itemSpanId === spanId}
          />
        );
      },
    },
    {
      name: i18n.translate(
        'xpack.apm.dependencyOperationDetailTraceListOutcomeColumn',
        { defaultMessage: 'Outcome' }
      ),
      field: 'outcome',
      render: (_, { outcome }) => {
        let color: string;
        if (outcome === EventOutcome.success) {
          color = theme.eui.euiColorSuccess;
        } else if (outcome === EventOutcome.failure) {
          color = theme.eui.euiColorDanger;
        } else {
          color = theme.eui.euiColorMediumShade;
        }

        return <EuiBadge color={color}>{outcome}</EuiBadge>;
      },
    },
    {
      name: i18n.translate(
        'xpack.apm.dependencyOperationDetailTraceListServiceNameColumn',
        { defaultMessage: 'Originating service' }
      ),
      field: 'serviceName',
      truncateText: true,
      render: (_, { serviceName, agentName }) => {
        const serviceLinkQuery = {
          comparisonEnabled,
          environment,
          kuery,
          rangeFrom,
          rangeTo,
          serviceGroup: '',
          refreshInterval,
          refreshPaused,
          offset,
        };

        return (
          <ServiceLink
            serviceName={serviceName}
            agentName={agentName}
            query={serviceLinkQuery}
          />
        );
      },
      sortable: true,
    },
    {
      name: i18n.translate(
        'xpack.apm.dependencyOperationDetailTraceListTransactionNameColumn',
        { defaultMessage: 'Transaction name' }
      ),
      field: 'transactionName',
      truncateText: true,
      width: '60%',
      render: (
        _,
        {
          serviceName,
          transactionName,
          traceId,
          transactionId,
          transactionType,
        }
      ) => {
        const href = getTraceLink({
          serviceName,
          transactionName,
          traceId,
          transactionId,
          transactionType,
        });

        return <EuiLink href={href}>{transactionName || traceId}</EuiLink>;
      },
      sortable: true,
    },
    {
      name: i18n.translate(
        'xpack.apm.dependencyOperationDetailTraceListDurationColumn',
        { defaultMessage: 'Duration' }
      ),
      field: 'duration',
      render: (_, { duration }) => {
        return asMillisecondDuration(duration);
      },
      sortable: true,
      align: RIGHT_ALIGNMENT,
    },
    {
      name: i18n.translate(
        'xpack.apm.dependencyOperationDetailTraceListTimestampColumn',
        { defaultMessage: 'Timestamp' }
      ),
      field: '@timestamp',
      truncateText: true,
      render: (_, { '@timestamp': timestamp }) => {
        return <TimestampTooltip time={timestamp} />;
      },
      sortable: true,
      align: RIGHT_ALIGNMENT,
    },
  ];

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <EuiText>
            {i18n.translate('xpack.apm.dependencyOperationDetailTraceList', {
              defaultMessage: 'Traces',
            })}
          </EuiText>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <ManagedTable
          tableLayout="auto"
          columns={columns}
          items={spanFetch.data?.spans || []}
          initialSortField={sortField}
          initialSortDirection={sortDirection}
          initialPageSize={pageSize}
          initialPageIndex={page}
          isLoading={
            spanFetch.status === FETCH_STATUS.LOADING ||
            spanFetch.status === FETCH_STATUS.NOT_INITIATED
          }
          sortFn={sortFn}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
