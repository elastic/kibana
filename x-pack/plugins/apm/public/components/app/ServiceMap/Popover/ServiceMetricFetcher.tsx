/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ServiceNodeMetrics } from '../../../../../common/service_map';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ServiceMetricList } from './ServiceMetricList';
import { AnomalyDetection } from './AnomalyDetection';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';
import { ALL_OPTION } from '../../../../hooks/useEnvironments';
import { MaxAnomaly } from '../../../../../common/anomaly_detection';

interface ServiceMetricFetcherProps {
  serviceName: string;
  maxAnomaly: MaxAnomaly | undefined;
}

export function ServiceMetricFetcher({
  serviceName,
  maxAnomaly,
}: ServiceMetricFetcherProps) {
  const {
    urlParams: { start, end, environment },
  } = useUrlParams();

  const {
    data = { transactionKPIs: {} } as ServiceNodeMetrics,
    status,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/service-map/service/{serviceName}',
          params: { path: { serviceName }, query: { start, end, environment } },
        });
      }
    },
    [serviceName, start, end, environment],
    {
      preservePreviousData: false,
    }
  );

  const isLoading =
    status === FETCH_STATUS.PENDING || status === FETCH_STATUS.LOADING;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (environment && !data.hasEnvironmentData) {
    return (
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.serviceMap.popoverMetrics.noEnvironmentDataCallout.title',
          {
            defaultMessage: 'No service data for current environment',
          }
        )}
        size="s"
        iconType="iInCircle"
      >
        {i18n.translate(
          'xpack.apm.serviceMap.popoverMetrics.noEnvironmentDataCallout.text',
          {
            defaultMessage: `This service belongs to an environment outside of the currently selected environment ({currentEnvironment}). Change the environment filter to [{environmentsWithData}] to see info on this service.`,
            values: {
              currentEnvironment: getEnvironmentLabel(environment),
              environmentsWithData: [
                ALL_OPTION.text,
                ...data.environmentsWithData.map(getEnvironmentLabel),
              ].join(', '),
            },
          }
        )}
      </EuiCallOut>
    );
  }
  return (
    <>
      <AnomalyDetection serviceName={serviceName} maxAnomaly={maxAnomaly} />
      <EuiHorizontalRule margin="xs" />
      <ServiceMetricList {...data} />
    </>
  );
}

function LoadingSpinner() {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      style={{ height: 170 }}
    >
      <EuiLoadingSpinner size="xl" />
    </EuiFlexGroup>
  );
}

function getEnvironmentLabel(environment: string) {
  if (environment === ENVIRONMENT_NOT_DEFINED) {
    return i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
      defaultMessage: 'Not defined',
    });
  }
  return environment;
}
