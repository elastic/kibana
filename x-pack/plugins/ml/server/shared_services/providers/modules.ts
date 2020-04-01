/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, SavedObjectsClientContract } from 'kibana/server';
import { LicenseCheck } from '../license_checks';
import { DataRecognizer, RecognizeResult } from '../../models/data_recognizer';
import {
  Module,
  DatafeedOverride,
  JobOverride,
  DataRecognizerConfigResponse,
} from '../../../common/types/modules';

export interface ModulesProvider {
  modulesProvider(
    callAsCurrentUser: APICaller,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    recognize(indexPatternTitle: string): Promise<RecognizeResult[]>;
    getModule(moduleId?: string): Promise<Module | Module[]>;
    saveModuleItems(
      moduleId: string,
      prefix: string,
      groups: string[],
      indexPatternName: string,
      query: any,
      useDedicatedIndex: boolean,
      startDatafeed: boolean,
      start: number,
      end: number,
      jobOverrides: JobOverride[],
      datafeedOverrides: DatafeedOverride[],
      estimateModelMemory?: boolean
    ): Promise<DataRecognizerConfigResponse>;
  };
}

export function getModulesProvider(isFullLicense: LicenseCheck): ModulesProvider {
  return {
    modulesProvider(callAsCurrentUser: APICaller, savedObjectsClient: SavedObjectsClientContract) {
      isFullLicense();
      return {
        recognize(indexPatternTitle: string) {
          const dr = dataRecognizerFactory(callAsCurrentUser, savedObjectsClient);
          return dr.findMatches(indexPatternTitle);
        },
        getModule(moduleId?: string) {
          const dr = dataRecognizerFactory(callAsCurrentUser, savedObjectsClient);
          if (moduleId === undefined) {
            return dr.listModules();
          } else {
            return dr.getModule(moduleId);
          }
        },
        saveModuleItems(
          moduleId: string,
          prefix: string,
          groups: string[],
          indexPatternName: string,
          query: any,
          useDedicatedIndex: boolean,
          startDatafeed: boolean,
          start: number,
          end: number,
          jobOverrides: JobOverride[],
          datafeedOverrides: DatafeedOverride[],
          estimateModelMemory?: boolean
        ) {
          const dr = dataRecognizerFactory(callAsCurrentUser, savedObjectsClient);
          return dr.setupModuleItems(
            moduleId,
            prefix,
            groups,
            indexPatternName,
            query,
            useDedicatedIndex,
            startDatafeed,
            start,
            end,
            jobOverrides,
            datafeedOverrides,
            estimateModelMemory
          );
        },
      };
    },
  };
}

function dataRecognizerFactory(
  callAsCurrentUser: APICaller,
  savedObjectsClient: SavedObjectsClientContract
) {
  return new DataRecognizer(callAsCurrentUser, savedObjectsClient);
}
