/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../observability/public';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { callApmApi } from '../../../services/rest/createCallApmApi';
import CustomPlot from '../../shared/charts/CustomPlot';

const ErrorGroupOverview: React.FC = () => {
  const { urlParams, uiFilters } = useUrlParams();

  const { serviceName, start, end, sortField, sortDirection } = urlParams;

  const { data: errorDistributionData } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/errors/distribution',
        params: {
          path: {
            serviceName
          },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters)
          }
        }
      });
    }
  }, [serviceName, start, end, uiFilters]);

  const { data: erroRateData } = useFetcher(() => {
    if (serviceName && start && end) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/errors/rate',
        params: {
          path: {
            serviceName
          },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters)
          }
        }
      });
    }
  }, [serviceName, start, end, uiFilters]);
  console.log('### caue: erroRateData', erroRateData);

  const { data: errorGroupListData } = useFetcher(() => {
    const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

    if (serviceName && start && end) {
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/errors',
        params: {
          path: {
            serviceName
          },
          query: {
            start,
            end,
            sortField,
            sortDirection: normalizedSortDirection,
            uiFilters: JSON.stringify(uiFilters)
          }
        }
      });
    }
  }, [serviceName, start, end, sortField, sortDirection, uiFilters]);

  useTrackPageview({
    app: 'apm',
    path: 'error_group_overview'
  });
  useTrackPageview({ app: 'apm', path: 'error_group_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['host', 'containerId', 'podName', 'serviceVersion'],
      params: {
        serviceName
      },
      projection: PROJECTION.ERROR_GROUPS
    };

    return config;
  }, [serviceName]);

  if (!errorDistributionData || !errorGroupListData) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={5}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel>
                <ErrorDistribution
                  distribution={errorDistributionData}
                  title={i18n.translate(
                    'xpack.apm.serviceDetails.metrics.errorOccurrencesChartTitle',
                    {
                      defaultMessage: 'Error occurrences'
                    }
                  )}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel>
                {/* <EuiTitle size="xs">
                  <span>{tpmLabel(transactionType)}</span> */}
                {/* </EuiTitle>
                <TransactionLineChart
                  series={tpmSeries}
                  tickFormatY={this.getTPMFormatter}
                  formatTooltipValue={this.getTPMTooltipFormatter}
                  truncateLegends
                /> */}
                {erroRateData && (
                  <CustomPlot
                    series={[
                      { data: erroRateData, type: 'line', color: '#f5a700' }
                    ]}
                    // onHover={combinedOnHover}
                    // tickFormatY={tickFormatY}
                    // formatTooltipValue={formatTooltipValue}
                    // yMax={yMax}
                    // height={height}
                    // truncateLegends={truncateLegends}
                    // {...(stacked ? { stackBy: 'y' } : {})}
                  />
                )}
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiPanel>
            <EuiTitle size="xs">
              <h3>Errors</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <ErrorGroupList items={errorGroupListData} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export { ErrorGroupOverview };
