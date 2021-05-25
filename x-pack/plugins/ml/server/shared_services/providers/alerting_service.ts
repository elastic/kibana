/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { GetGuards } from '../shared_services';
import { alertingServiceProvider, MlAlertingService } from '../../lib/alerts/alerting_service';
import { datafeedsProvider } from '../../models/job_service/datafeeds';

export function getAlertingServiceProvider(getGuards: GetGuards) {
  return {
    alertingServiceProvider(
      savedObjectsClient: SavedObjectsClientContract,
      request: KibanaRequest
    ) {
      return {
        preview: async (...args: Parameters<MlAlertingService['preview']>) => {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(({ mlClient, scopedClient }) =>
              alertingServiceProvider(mlClient, datafeedsProvider(scopedClient, mlClient)).preview(
                ...args
              )
            );
        },
        execute: async (
          ...args: Parameters<MlAlertingService['execute']>
        ): ReturnType<MlAlertingService['execute']> => {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(({ mlClient, scopedClient }) =>
              alertingServiceProvider(mlClient, datafeedsProvider(scopedClient, mlClient)).execute(
                ...args
              )
            );
        },
      };
    },
  };
}

export type MlAlertingServiceProvider = ReturnType<typeof getAlertingServiceProvider>;
