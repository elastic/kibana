/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ServiceNodeMetrics } from '../../../../../common/service_map';
import { useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ServiceMetricList } from './ServiceMetricList';

interface ServiceMetricFetcherProps {
  serviceName: string;
}

export function ServiceMetricFetcher({
  serviceName,
}: ServiceMetricFetcherProps) {
  const {
    urlParams: { start, end, environment },
  } = useUrlParams();

  const { data = {} as ServiceNodeMetrics, status } = useFetcher(
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

  return <ServiceMetricList {...data} isLoading={isLoading} />;
}
