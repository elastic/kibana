/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { DataRecognizer } from '../../models/data_recognizer';
import { GetGuards } from '../shared_services';
import { moduleIdParamSchema, setupModuleBodySchema } from '../../routes/schemas/modules';
import { MlClient } from '../../lib/ml_client';

export type ModuleSetupPayload = TypeOf<typeof moduleIdParamSchema> &
  TypeOf<typeof setupModuleBodySchema>;

export interface ModulesProvider {
  modulesProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    recognize: DataRecognizer['findMatches'];
    getModule: DataRecognizer['getModule'];
    listModules: DataRecognizer['listModules'];
    setup(payload: ModuleSetupPayload): ReturnType<DataRecognizer['setup']>;
  };
}

export function getModulesProvider(getGuards: GetGuards): ModulesProvider {
  return {
    modulesProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      return {
        async recognize(...args) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient, mlClient }) => {
              const dr = dataRecognizerFactory(scopedClient, mlClient, savedObjectsClient, request);
              return dr.findMatches(...args);
            });
        },
        async getModule(moduleId: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient, mlClient }) => {
              const dr = dataRecognizerFactory(scopedClient, mlClient, savedObjectsClient, request);
              return dr.getModule(moduleId);
            });
        },
        async listModules() {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient, mlClient }) => {
              const dr = dataRecognizerFactory(scopedClient, mlClient, savedObjectsClient, request);
              return dr.listModules();
            });
        },
        async setup(payload: ModuleSetupPayload) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canCreateJob'])
            .ok(async ({ scopedClient, mlClient }) => {
              const dr = dataRecognizerFactory(scopedClient, mlClient, savedObjectsClient, request);
              return dr.setup(
                payload.moduleId,
                payload.prefix,
                payload.groups,
                payload.indexPatternName,
                payload.query,
                payload.useDedicatedIndex,
                payload.startDatafeed,
                payload.start,
                payload.end,
                payload.jobOverrides,
                payload.datafeedOverrides,
                payload.estimateModelMemory
              );
            });
        },
      };
    },
  };
}

function dataRecognizerFactory(
  client: IScopedClusterClient,
  mlClient: MlClient,
  savedObjectsClient: SavedObjectsClientContract,
  request: KibanaRequest
) {
  return new DataRecognizer(client, mlClient, savedObjectsClient, request);
}
