/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ILegacyScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { DataRecognizer } from '../../models/data_recognizer';
import { SharedServicesChecks } from '../shared_services';
import { moduleIdParamSchema, setupModuleBodySchema } from '../../routes/schemas/modules';
import { HasMlCapabilities } from '../../lib/capabilities';

export type ModuleSetupPayload = TypeOf<typeof moduleIdParamSchema> &
  TypeOf<typeof setupModuleBodySchema>;

export interface ModulesProvider {
  modulesProvider(
    mlClusterClient: ILegacyScopedClusterClient,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    recognize: DataRecognizer['findMatches'];
    getModule: DataRecognizer['getModule'];
    listModules: DataRecognizer['listModules'];
    setup(payload: ModuleSetupPayload): ReturnType<DataRecognizer['setup']>;
  };
}

export function getModulesProvider({
  isFullLicense,
  getHasMlCapabilities,
}: SharedServicesChecks): ModulesProvider {
  return {
    modulesProvider(
      mlClusterClient: ILegacyScopedClusterClient,
      request: KibanaRequest,
      savedObjectsClient: SavedObjectsClientContract
    ) {
      let hasMlCapabilities: HasMlCapabilities;
      if (request.params === 'DummyKibanaRequest') {
        hasMlCapabilities = () => Promise.resolve();
      } else {
        hasMlCapabilities = getHasMlCapabilities(request);
      }
      const dr = dataRecognizerFactory(mlClusterClient, savedObjectsClient, request);

      return {
        async recognize(...args) {
          isFullLicense();
          await hasMlCapabilities(['canCreateJob']);

          return dr.findMatches(...args);
        },
        async getModule(moduleId: string) {
          isFullLicense();
          await hasMlCapabilities(['canGetJobs']);

          return dr.getModule(moduleId);
        },
        async listModules() {
          isFullLicense();
          await hasMlCapabilities(['canGetJobs']);

          return dr.listModules();
        },
        async setup(payload: ModuleSetupPayload) {
          isFullLicense();
          await hasMlCapabilities(['canCreateJob']);

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
        },
      };
    },
  };
}

function dataRecognizerFactory(
  mlClusterClient: ILegacyScopedClusterClient,
  savedObjectsClient: SavedObjectsClientContract,
  request: KibanaRequest
) {
  return new DataRecognizer(mlClusterClient, savedObjectsClient, request);
}
