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
  EuiText,
  EuiTitle,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ValuesType } from 'utility-types';
import { EventOutcome } from '../../../../common/event_outcome';
import { asMillisecondDuration } from '../../../../common/utils/formatters';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ITableColumn, ManagedTable } from '../../shared/managed_table';
import { ServiceLink } from '../../shared/service_link';
import { TimestampTooltip } from '../../shared/timestamp_tooltip';

type BackendSpan = ValuesType<
  APIReturnType<'GET /internal/apm/dependencies/operations/spans'>['spans']
>;

export function BackendOperationDetailTraceList() {
  const router = useApmRouter();

  const theme = useTheme();

  const {
    query: {
      backendName,
      spanName,
      comparisonEnabled,
      environment,
      offset,
      rangeFrom,
      rangeTo,
      refreshInterval,
      refreshPaused,
      kuery,
      sampleRangeFrom,
      sampleRangeTo,
    },
  } = useApmParams('/backends/operation');

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

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const columns: Array<ITableColumn<BackendSpan>> = [
    {
      name: i18n.translate(
        'xpack.apm.backendOperationDetailTraceListOutcomeColumn',
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
        'xpack.apm.backendOperationDetailTraceListTraceIdColumn',
        { defaultMessage: 'Trace' }
      ),
      field: 'traceId',
      render: (
        _,
        {
          serviceName,
          traceId,
          transactionId,
          transactionName,
          transactionType,
        }
      ) => {
        const href = getTraceLink({
          serviceName,
          traceId,
          transactionId,
          transactionType,
          transactionName,
        });

        return (
          <EuiLink href={href} style={{ whiteSpace: 'nowrap' }}>
            {traceId.substr(0, 6)}
          </EuiLink>
        );
      },
    },
    {
      name: i18n.translate(
        'xpack.apm.backendOperationDetailTraceListServiceNameColumn',
        { defaultMessage: 'Originating service' }
      ),
      field: 'serviceName',
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
        'xpack.apm.backendOperationDetailTraceListTransactionNameColumn',
        { defaultMessage: 'Transaction name' }
      ),
      field: 'transactionName',
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
        'xpack.apm.backendOperationDetailTraceListDurationColumn',
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
        'xpack.apm.backendOperationDetailTraceListTimestampColumn',
        { defaultMessage: 'Timestamp' }
      ),
      field: '@timestamp',
      render: (_, { '@timestamp': timestamp }) => {
        return <TimestampTooltip time={timestamp} />;
      },
      sortable: true,
      align: RIGHT_ALIGNMENT,
    },
  ];

  const { data = { spans: [] }, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/dependencies/operations/spans', {
        params: {
          query: {
            backendName,
            spanName,
            start,
            end,
            environment,
            kuery,
            sampleRangeFrom,
            sampleRangeTo,
          },
        },
      });
    },
    [
      backendName,
      spanName,
      start,
      end,
      environment,
      kuery,
      sampleRangeFrom,
      sampleRangeTo,
    ]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <EuiText>
            {i18n.translate('xpack.apm.backendOperationDetailTraceList', {
              defaultMessage: 'Traces',
            })}
          </EuiText>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <ManagedTable
          columns={columns}
          items={data?.spans}
          initialSortField="@timestamp"
          initialSortDirection="desc"
          initialPageSize={10}
          isLoading={
            status === FETCH_STATUS.LOADING ||
            status === FETCH_STATUS.NOT_INITIATED
          }
          tableLayout="auto"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
