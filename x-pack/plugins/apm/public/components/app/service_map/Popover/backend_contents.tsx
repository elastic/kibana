/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import { METRIC_TYPE } from '@kbn/analytics';
import React from 'react';
import { useUiTracker } from '../../../../../../observability/public';
import { ContentsProps } from '.';
import { NodeStats } from '../../../../../common/service_map';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ApmRoutes } from '../../../routing/apm_route_config';
import { StatsList } from './stats_list';

export function BackendContents({
  nodeData,
  environment,
  start,
  end,
}: ContentsProps) {
  const { query } = useApmParams(
    '/service-map',
    '/services/{serviceName}/service-map'
  );

  const apmRouter = useApmRouter();

  const backendName = nodeData.label;

  const { data = { transactionStats: {} } as NodeStats, status } = useFetcher(
    (callApmApi) => {
      if (backendName) {
        return callApmApi({
          endpoint: 'GET /api/apm/service-map/backend/{backendName}',
          params: {
            path: { backendName },
            query: {
              environment,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, backendName, start, end],
    {
      preservePreviousData: false,
    }
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const detailsUrl = apmRouter.link('/backends/{backendName}/overview', {
    path: { backendName },
    query: query as TypeOf<
      ApmRoutes,
      '/backends/{backendName}/overview'
    >['query'],
  });

  const trackEvent = useUiTracker();

  return (
    <>
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click*/}
        <EuiButton
          href={detailsUrl}
          fill={true}
          onClick={() => {
            trackEvent({
              app: 'apm',
              metricType: METRIC_TYPE.CLICK,
              metric: 'service_map_to_backend_detail',
            });
          }}
        >
          {i18n.translate('xpack.apm.serviceMap.dependencyDetailsButtonText', {
            defaultMessage: 'Dependency Details',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
