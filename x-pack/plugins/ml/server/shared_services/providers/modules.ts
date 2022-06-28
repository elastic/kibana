/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { GetGuards } from '../shared_services';
import { DataRecognizer, dataRecognizerFactory } from '../../models/data_recognizer';
import { moduleIdParamSchema, setupModuleBodySchema } from '../../routes/schemas/modules';

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

export function getModulesProvider(
  getGuards: GetGuards,
  getDataViews: () => DataViewsPluginStart
): ModulesProvider {
  return {
    modulesProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract) {
      return {
        async recognize(...args) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient, mlClient, mlSavedObjectService, getDataViewsService }) => {
              const dataViewsService = await getDataViewsService();
              const dr = dataRecognizerFactory(
                scopedClient,
                mlClient,
                savedObjectsClient,
                dataViewsService,
                mlSavedObjectService,
                request
              );
              return dr.findMatches(...args);
            });
        },
        async getModule(moduleId: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient, mlClient, mlSavedObjectService, getDataViewsService }) => {
              const dataViewsService = await getDataViewsService();
              const dr = dataRecognizerFactory(
                scopedClient,
                mlClient,
                savedObjectsClient,
                dataViewsService,
                mlSavedObjectService,
                request
              );
              return dr.getModule(moduleId);
            });
        },
        async listModules() {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ scopedClient, mlClient, mlSavedObjectService, getDataViewsService }) => {
              const dataViewsService = await getDataViewsService();
              const dr = dataRecognizerFactory(
                scopedClient,
                mlClient,
                savedObjectsClient,
                dataViewsService,
                mlSavedObjectService,
                request
              );
              return dr.listModules();
            });
        },
        async setup(payload: ModuleSetupPayload) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canCreateJob'])
            .ok(async ({ scopedClient, mlClient, mlSavedObjectService, getDataViewsService }) => {
              const dataViewsService = await getDataViewsService();
              const dr = dataRecognizerFactory(
                scopedClient,
                mlClient,
                savedObjectsClient,
                dataViewsService,
                mlSavedObjectService,
                request
              );
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
