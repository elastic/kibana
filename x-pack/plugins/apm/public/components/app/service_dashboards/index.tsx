/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { EmptyDashboards } from './empty_dashboards';
import { AddDashboard } from './actions';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import {
  AwaitingDashboardAPI,
  DashboardRenderer,
} from '@kbn/dashboard-plugin/public';

export function ServiceDashboards() {
  const {
    path: { serviceName },
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/dashboards');

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (serviceName) {
        return callApmApi(
          `GET /internal/apm/services/{serviceName}/dashboards`,
          {
            params: {
              path: { serviceName },
            },
          }
        );
      }
    },
    [serviceName]
  );

  console.log('data====', data);

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>Title Placeholder</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDashboard />
        </EuiFlexItem>
      </EuiFlexGroup>
      // TODO add loading
      {data && data?.serviceSpecificDashboards ? (
        <DashboardRenderer
          savedObjectId={
            data?.serviceSpecificDashboards[0].dashboardSavedObjectId
          }
        />
      ) : (
        <EmptyDashboards actions={<AddDashboard />} />
      )}
    </EuiPanel>
  );
}
