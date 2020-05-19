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
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { Maybe } from '../../../../typings/common';
import { useFetcher } from '../../../hooks/useFetcher';
import { ErrorDistribution } from '../ErrorGroupDetails/Distribution';
import { ErrorGroupList } from './List';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../observability/public';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { callApmApi } from '../../../services/rest/createCallApmApi';
// @ts-ignore
import CustomPlot from '../../shared/charts/CustomPlot';
import { unit } from '../../../style/variables';
import { asPercent } from '../../../utils/formatters';

const ErrorGroupOverview: React.FC = () => {
  const { urlParams, uiFilters } = useUrlParams();
  const [errorRateTime, setErrorRateTime] = useState();

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

  const tickFormatY = (y: Maybe<number>) => {
    return numeral(y || 0).format('0 %');
  };

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
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
                <EuiTitle size="xs">
                  <span>
                    {i18n.translate(
                      'xpack.apm.serviceDetails.metrics.errorRateChartTitle',
                      {
                        defaultMessage: 'Error Rate'
                      }
                    )}
                  </span>
                </EuiTitle>
                {erroRateData && (
                  <CustomPlot
                    series={[
                      {
                        data: erroRateData,
                        type: 'line',
                        color: '#f5a700',
                        hideLegend: true,
                        title: 'Rate'
                      }
                    ]}
                    onHover={(time: number) => {
                      setErrorRateTime(time);
                    }}
                    hoverX={errorRateTime}
                    tickFormatY={tickFormatY}
                    formatTooltipValue={({ y }: { y: number }) => {
                      return asPercent(y, 1);
                    }}
                    height={unit * 10}
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
