/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { Projection } from '../../../../common/projections';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { SearchBar } from '../../shared/search_bar';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';

interface ErrorGroupOverviewProps {
  serviceName: string;
}

function ErrorGroupOverview({ serviceName }: ErrorGroupOverviewProps) {
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end, sortField, sortDirection } = urlParams;
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
    [serviceName, start, end, sortField, sortDirection, uiFilters]
  );

  useTrackPageview({
    app: 'apm',
    path: 'error_group_overview',
  });
  useTrackPageview({ app: 'apm', path: 'error_group_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['host', 'containerId', 'podName', 'serviceVersion'],
      params: {
        serviceName,
      },
      projection: Projection.errorGroups,
    };

    return config;
  }, [serviceName]);

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <LocalUIFilters {...localUIFiltersConfig} />
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}

export { ErrorGroupOverview };
