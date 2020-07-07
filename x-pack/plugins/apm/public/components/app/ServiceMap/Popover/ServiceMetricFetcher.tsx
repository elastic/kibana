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
} from '@elastic/eui';
import { ServiceNodeMetrics } from '../../../../../common/service_map';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ServiceMetricList } from './ServiceMetricList';
import { ServiceHealth } from './ServiceHealth';

interface ServiceMetricFetcherProps {
  serviceName: string;
  anomalies:
    | undefined
    | Array<{
        'transaction.type': string;
        anomaly_score: number;
        actual_value: number;
      }>;
}

export function ServiceMetricFetcher({
  serviceName,
  anomalies,
}: ServiceMetricFetcherProps) {
  const {
    urlParams: { start, end, environment },
  } = useUrlParams();

  const {
    data = ({ transactionMetrics: [] } as unknown) as ServiceNodeMetrics,
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
  const isLoading = status === 'loading';

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <ServiceHealth
        anomalies={anomalies}
        transactionMetrics={data.transactionMetrics}
      />
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
