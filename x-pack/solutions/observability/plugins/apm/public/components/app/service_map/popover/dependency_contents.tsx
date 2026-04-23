/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TypeOf } from '@kbn/typed-react-router-config';
import { METRIC_TYPE } from '@kbn/analytics';
import React from 'react';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { isEdge } from './utils';
import type { ContentsProps } from './popover_content';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import type { ApmRoutes } from '../../../routing/apm_route_config';
import { StatsList } from './stats_list';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';

type DependencyReturn = APIReturnType<'GET /internal/apm/service-map/dependency'>;

const INITIAL_STATE: Partial<DependencyReturn> = {
  currentPeriod: undefined,
  previousPeriod: undefined,
};

export function DependencyContents({ selection, environment, start, end }: ContentsProps) {
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { offset, comparisonEnabled } = query;
  const apmRouter = useApmRouter();

  const isNode = !isEdge(selection);
  const dependencyName = isNode ? selection.data.label : undefined;

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (dependencyName) {
        return callApmApi('GET /internal/apm/service-map/dependency', {
          params: {
            query: {
              dependencies: dependencyName,
              environment,
              start,
              end,
              offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
            },
          },
        });
      }
    },
    [environment, dependencyName, start, end, offset, comparisonEnabled]
  );

  const isLoading = status === FETCH_STATUS.LOADING;
  const trackEvent = useUiTracker();

  if (!isNode) {
    return null;
  }

  const detailsUrl = dependencyName
    ? apmRouter.link('/dependencies/overview', {
        query: {
          ...query,
          dependencyName,
        } as TypeOf<ApmRoutes, '/dependencies/overview'>['query'],
      })
    : undefined;

  return (
    <>
      <EuiFlexItem>
        <StatsList data={data} isLoading={isLoading} />
      </EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click*/}
        <EuiButton
          data-test-subj="apmDependencyContentsDependencyDetailsButton"
          href={detailsUrl}
          fill={true}
          onClick={() => {
            trackEvent({
              app: 'apm',
              metricType: METRIC_TYPE.CLICK,
              metric: 'service_map_to_dependency_detail',
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
