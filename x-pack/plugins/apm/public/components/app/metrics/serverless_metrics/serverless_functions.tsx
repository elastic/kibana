/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import {
  asDynamicBytes,
  asMillisecondDuration,
} from '../../../../../common/utils/formatters';

type ServerlessFunctionOverview =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview'>['serverlessFunctionsOverview'][0];

export function ServerlessFunctions() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { serviceName } = useApmServiceContext();

  const { data = { serverlessFunctionsOverview: [] }, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              kuery,
              environment,
              start,
              end,
            },
          },
        }
      );
    },
    [kuery, environment, serviceName, start, end]
  );

  const columns: Array<EuiBasicTableColumn<ServerlessFunctionOverview>> = [
    {
      field: 'serverlessFunctionName',
      name: i18n.translate(
        'xpack.apm.serverlessMetrics.serverlessFunctions.functionName',
        { defaultMessage: 'Function name' }
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'serverlessDurationAvg',
      name: i18n.translate(
        'xpack.apm.serverlessMetrics.serverlessFunctions.functionDuration',
        { defaultMessage: 'Function duration' }
      ),
      sortable: true,
      render: (_, { serverlessDurationAvg }) => {
        return asMillisecondDuration(serverlessDurationAvg);
      },
    },
    {
      field: 'billedDurationAvg',
      name: i18n.translate(
        'xpack.apm.serverlessMetrics.serverlessFunctions.billedDuration',
        { defaultMessage: 'Billed duration' }
      ),
      sortable: true,
      render: (_, { billedDurationAvg }) => {
        return asMillisecondDuration(billedDurationAvg);
      },
    },
    {
      field: 'avgMemoryUsed',
      name: i18n.translate(
        'xpack.apm.serverlessMetrics.serverlessFunctions.memoryUsageAvg',
        { defaultMessage: 'Memory usage avg.' }
      ),
      sortable: true,
      render: (_, { avgMemoryUsed }) => {
        return asDynamicBytes(avgMemoryUsed);
      },
    },
    {
      field: 'memorySize',
      name: i18n.translate(
        'xpack.apm.serverlessMetrics.serverlessFunctions.memorySize',
        { defaultMessage: 'Memory size' }
      ),
      sortable: true,
      render: (_, { memorySize }) => {
        return asDynamicBytes(memorySize);
      },
    },
    {
      field: 'coldStartCount',
      name: i18n.translate(
        'xpack.apm.serverlessMetrics.serverlessFunctions.coldStart',
        { defaultMessage: 'Cold start' }
      ),
      sortable: true,
    },
  ];

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.apm.serverlessMetrics.serverlessFunctions.title',
                    { defaultMessage: 'Lambda functions' }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.apm.serverlessMetrics.serverlessFunctions.description',
                  { defaultMessage: 'TBD' }
                )}
                position="top"
                type="questionInCircle"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiInMemoryTable
            items={data.serverlessFunctionsOverview}
            columns={columns}
            pagination={{ showPerPageOptions: false, pageSize: 5 }}
            // sorting={sorting}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
