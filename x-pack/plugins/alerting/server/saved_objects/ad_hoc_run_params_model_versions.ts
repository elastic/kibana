/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsModelVersion,
  SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import { AdHocRunSO } from '../data/ad_hoc_run/types';
import { rawAdHocRunParamsSchemaV1 } from './schemas/raw_ad_hoc_run_params';

interface CustomSavedObjectsModelVersion extends SavedObjectsModelVersion {
  isCompatibleWithPreviousVersion: (param: AdHocRunSO) => boolean;
}

export interface CustomSavedObjectsModelVersionMap extends SavedObjectsModelVersionMap {
  [modelVersion: string]: CustomSavedObjectsModelVersion;
}

export const adHocRunParamsModelVersions: CustomSavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV1,
    },
    isCompatibleWithPreviousVersion: () => true,
  },
};

export const getLatestAdHocRunParamsVersion = () =>
  Math.max(...Object.keys(adHocRunParamsModelVersions).map(Number));

export function getMinimumCompatibleVersion(
  modelVersions: CustomSavedObjectsModelVersionMap,
  version: number,
  adHocRunParam: AdHocRunSO
): number {
  if (version === 1) {
    return 1;
  }

  if (modelVersions[version].isCompatibleWithPreviousVersion(adHocRunParam)) {
    return getMinimumCompatibleVersion(modelVersions, version - 1, adHocRunParam);
  }

  return version;
}
