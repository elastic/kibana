/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import { METRIC_TYPE } from '@kbn/analytics';
import React from 'react';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { ContentsProps } from '.';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ApmRoutes } from '../../../routing/apm_route_config';
import { StatsList } from './stats_list';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type BackendReturn = APIReturnType<'GET /internal/apm/service-map/backend'>;

const INITIAL_STATE: Partial<BackendReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

export function BackendContents({
  nodeData,
  environment,
  start,
  end,
}: ContentsProps) {
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map'
  );

  const { offset, comparisonEnabled } = query;

  const apmRouter = useApmRouter();

  const backendName = nodeData.label;

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (backendName) {
        return callApmApi('GET /internal/apm/service-map/backend', {
          params: {
            query: {
              backendName,
              environment,
              start,
              end,
              offset: comparisonEnabled ? offset : undefined,
            },
          },
        });
      }
    },
    [environment, backendName, start, end, offset, comparisonEnabled]
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const detailsUrl = backendName
    ? apmRouter.link('/backends/overview', {
        query: {
          ...query,
          backendName,
        } as TypeOf<ApmRoutes, '/backends/overview'>['query'],
      })
    : undefined;

  const trackEvent = useUiTracker();

  return (
    <>
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiSpacer size="s" />
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
