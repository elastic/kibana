/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { CloudDetails } from './cloud_details';
import { ContainerDetails } from './container_details';
import { ServiceDetails } from './service_details';

interface Props {
  serviceName: string;
}

export function ServiceNameHeader({ serviceName }: Props) {
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end } = urlParams;

  const { data: serviceDetails, status: serviceDetailsStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}',
          params: {
            path: { serviceName },
            query: { start, end, uiFilters: JSON.stringify(uiFilters) },
          },
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  const isLoading =
    !serviceDetails && serviceDetailsStatus === FETCH_STATUS.LOADING;

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h1>{serviceName}</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isLoading && <EuiLoadingSpinner />}

        {serviceDetails && (
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <ServiceDetails service={serviceDetails?.service} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ContainerDetails container={serviceDetails?.container} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CloudDetails cloud={serviceDetails?.cloud} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
