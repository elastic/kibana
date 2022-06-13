/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
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
import { asMillisecondDuration } from '../../../../common/utils/formatters';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ITableColumn, ManagedTable } from '../../shared/managed_table';
import { ServiceLink } from '../../shared/service_link';
import { TimestampTooltip } from '../../shared/timestamp_tooltip';

type BackendSpan = ValuesType<
  APIReturnType<'GET /internal/apm/backends/operations/spans'>['spans']
>;

export function BackendOperationDetailTraceList() {
  const router = useApmRouter();

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
    },
  } = useApmParams('/backends/operation');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const columns: Array<ITableColumn<BackendSpan>> = [
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
      width: '30%',
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

        return <EuiLink href={href}>{transactionName || traceId}</EuiLink>;
      },
      width: '50%',
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
      return callApmApi('GET /internal/apm/backends/operations/spans', {
        params: {
          query: {
            backendName,
            spanName,
            start,
            end,
            environment,
            kuery,
          },
        },
      });
    },
    [backendName, spanName, start, end, environment, kuery]
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
          initialSortField="timestamp"
          initialSortDirection="asc"
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
