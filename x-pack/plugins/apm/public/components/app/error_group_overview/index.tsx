/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';

interface ErrorGroupOverviewProps {
  serviceName: string;
}

export function ErrorGroupOverview({ serviceName }: ErrorGroupOverviewProps) {
  const {
    urlParams: { environment, kuery, start, end, sortField, sortDirection },
  } = useUrlParams();
  const { errorDistributionData } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId: undefined,
  });

  const { data: errorGroupListData } = useFetcher(
    (callApmApi) => {
      const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/errors',
          params: {
            path: {
              serviceName,
            },
            query: {
              environment,
              kuery,
              start,
              end,
              sortField,
              sortDirection: normalizedSortDirection,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, sortField, sortDirection]
  );

  useTrackPageview({
    app: 'apm',
    path: 'error_group_overview',
  });
  useTrackPageview({ app: 'apm', path: 'error_group_overview', delay: 15000 });

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiPanel>
          <ErrorDistribution
            distribution={errorDistributionData}
            title={i18n.translate(
              'xpack.apm.serviceDetails.metrics.errorOccurrencesChart.title',
              { defaultMessage: 'Error occurrences' }
            )}
          />
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPanel>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.apm.serviceDetails.metrics.errorsList.title',
                { defaultMessage: 'Errors' }
              )}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <ErrorGroupList
            items={errorGroupListData.errorGroups}
            serviceName={serviceName}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
