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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isNumber } from 'lodash';
import { ServiceNodeMetrics } from '../../../../../common/service_map';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ServiceMetricList } from './ServiceMetricList';
import { AnomalyDetection } from './AnomalyDetection';
import { ServiceAnomalyStats } from '../../../../../common/anomaly_detection';

interface ServiceMetricFetcherProps {
  serviceName: string;
  serviceAnomalyStats: ServiceAnomalyStats | undefined;
}

export function ServiceMetricFetcher({
  serviceName,
  serviceAnomalyStats,
}: ServiceMetricFetcherProps) {
  const {
    urlParams: { start, end, environment },
  } = useUrlParams();

  const {
    data = { transactionStats: {} } as ServiceNodeMetrics,
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

  const {
    avgCpuUsage,
    avgErrorsPerMinute,
    avgMemoryUsage,
    transactionStats: { avgRequestsPerMinute, avgTransactionDuration },
  } = data;

  const hasServiceData = [
    avgCpuUsage,
    avgErrorsPerMinute,
    avgMemoryUsage,
    avgRequestsPerMinute,
    avgTransactionDuration,
  ].some((stat) => isNumber(stat));

  if (environment && !hasServiceData) {
    return (
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.serviceMap.popoverMetrics.noDataText', {
          defaultMessage: `No data for selected environment. Try switching to another environment.`,
        })}
      </EuiText>
    );
  }
  return (
    <>
      {serviceAnomalyStats && (
        <>
          <AnomalyDetection
            serviceName={serviceName}
            serviceAnomalyStats={serviceAnomalyStats}
          />
          <EuiHorizontalRule margin="xs" />
        </>
      )}
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
