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
import { FETCH_STATUS, useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { CloudDetails } from './cloud_details';
import { ContainerDetails } from './container_details';
import { ServiceDetails } from './service_details';

interface Props {
  serviceName: string;
}

export function ServiceNameHeader({ serviceName }: Props) {
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;

  const { data: serviceDetails, status: serviceDetailsStatus } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}',
          params: { path: { serviceName }, query: { start, end } },
        });
      }
    },
    [serviceName, start, end]
  );

  const isLoading =
    !serviceDetails && serviceDetailsStatus === FETCH_STATUS.LOADING;

  return (
    <EuiFlexGroup>
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
              <ServiceDetails serviceDetails={serviceDetails} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ContainerDetails serviceDetails={serviceDetails} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CloudDetails serviceDetails={serviceDetails} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
