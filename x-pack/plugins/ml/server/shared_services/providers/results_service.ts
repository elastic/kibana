/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { resultsServiceProvider } from '../../models/results_service';
import { GetGuards } from '../shared_services';

type OrigResultsServiceProvider = ReturnType<typeof resultsServiceProvider>;

export interface ResultsServiceProvider {
  resultsServiceProvider(
    request: KibanaRequest
  ): {
    getAnomaliesTableData: OrigResultsServiceProvider['getAnomaliesTableData'];
  };
}

export function getResultsServiceProvider(getGuards: GetGuards): ResultsServiceProvider {
  return {
    resultsServiceProvider(request: KibanaRequest) {
      //  Uptime is using this service in anomaly alert, kibana alerting doesn't provide request object
      // So we are adding a dummy request for now
      // TODO: Remove this once kibana alerting provides request object
      return {
        async getAnomaliesTableData(...args) {
          return await getGuards(request)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient }) => {
              const { getAnomaliesTableData } = resultsServiceProvider(scopedClient);
              return getAnomaliesTableData(...args);
            });
        },
      };
    },
  };
}
