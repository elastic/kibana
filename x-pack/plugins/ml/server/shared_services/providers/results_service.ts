/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, KibanaRequest } from 'kibana/server';
import { resultsServiceProvider } from '../../models/results_service';
import { SharedServicesChecks } from '../shared_services';
import { HasMlCapabilities } from '../../lib/capabilities';

type OrigResultsServiceProvider = ReturnType<typeof resultsServiceProvider>;

export interface ResultsServiceProvider {
  resultsServiceProvider(
    callAsCurrentUser: LegacyAPICaller,
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
    resultsServiceProvider(callAsCurrentUser: LegacyAPICaller, request: KibanaRequest) {
      let hasMlCapabilities: HasMlCapabilities;
      //  Uptime is using this service in anomaly alert, kibana alerting doesn't provide request object
      // So we are adding a dummy request for now
      // TODO: Remove this once kibana alerting provides request object
      if (request.params !== 'DummyKibanaRequest') {
        hasMlCapabilities = getHasMlCapabilities(request);
      }
      const { getAnomaliesTableData } = resultsServiceProvider(callAsCurrentUser);
      return {
        async getAnomaliesTableData(...args) {
          isFullLicense();
          if (hasMlCapabilities) {
            await hasMlCapabilities(['canGetJobs']);
          }

          return getAnomaliesTableData(...args);
        },
      };
    },
  };
}
