/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient, KibanaRequest } from 'kibana/server';
import { resultsServiceProvider } from '../../models/results_service';
import { SharedServicesChecks } from '../shared_services';

type OrigResultsServiceProvider = ReturnType<typeof resultsServiceProvider>;

export interface ResultsServiceProvider {
  resultsServiceProvider(
    mlClusterClient: ILegacyScopedClusterClient,
    request: KibanaRequest
  ): {
    getAnomaliesTableData: OrigResultsServiceProvider['getAnomaliesTableData'];
  };
}

export function getResultsServiceProvider({
  isFullLicense,
  getHasMlCapabilities,
}: SharedServicesChecks): ResultsServiceProvider {
  return {
    resultsServiceProvider(mlClusterClient: ILegacyScopedClusterClient, request: KibanaRequest) {
      //  Uptime is using this service in anomaly alert, kibana alerting doesn't provide request object
      // So we are adding a dummy request for now
      // TODO: Remove this once kibana alerting provides request object
      const hasMlCapabilities =
        request.params !== 'DummyKibanaRequest'
          ? getHasMlCapabilities(request)
          : (_caps: string[]) => Promise.resolve();

      const { getAnomaliesTableData } = resultsServiceProvider(mlClusterClient);
      return {
        async getAnomaliesTableData(...args) {
          isFullLicense();
          await hasMlCapabilities(['canGetJobs']);
          return getAnomaliesTableData(...args);
        },
      };
    },
  };
}
