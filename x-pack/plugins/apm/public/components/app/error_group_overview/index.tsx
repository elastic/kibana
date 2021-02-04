/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiPage,
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
import { SearchBar } from '../../shared/search_bar';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';

interface ErrorGroupOverviewProps {
  serviceName: string;
}

export function ErrorGroupOverview({ serviceName }: ErrorGroupOverviewProps) {
  const { urlParams, uiFilters } = useUrlParams();
  const { environment, start, end, sortField, sortDirection } = urlParams;
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
              start,
              end,
              sortField,
              sortDirection: normalizedSortDirection,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [environment, serviceName, start, end, sortField, sortDirection, uiFilters]
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
    <>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiPanel>
            <ErrorDistribution
              distribution={errorDistributionData}
              title={i18n.translate(
                'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                {
                  defaultMessage: 'Error occurrences',
                }
              )}
            />
          </EuiPanel>

          <EuiSpacer size="s" />

          <EuiPanel>
            <EuiTitle size="xs">
              <h3>Errors</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <ErrorGroupList
              items={errorGroupListData}
              serviceName={serviceName}
            />
          </EuiPanel>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
