/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { resultsServiceProvider } from '../../models/results_service';
import { GetGuards } from '../shared_services';

type OrigResultsServiceProvider = ReturnType<typeof resultsServiceProvider>;

export interface ResultsServiceProvider {
  resultsServiceProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    getAnomaliesTableData: OrigResultsServiceProvider['getAnomaliesTableData'];
  };
}

export function getResultsServiceProvider(getGuards: GetGuards): ResultsServiceProvider {
  return {
    resultsServiceProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      return {
        async getAnomaliesTableData(...args) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ mlClient }) => {
              const { getAnomaliesTableData } = resultsServiceProvider(mlClient);
              return getAnomaliesTableData(...args);
            });
        },
      };
    },
  };
}
