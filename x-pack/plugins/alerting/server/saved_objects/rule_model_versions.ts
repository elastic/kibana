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
import { RawRule } from '../types';
import { rawRuleSchemaV1 } from './schemas/raw_rule';

interface CustomSavedObjectsModelVersion extends SavedObjectsModelVersion {
  isCompatibleWithPreviousVersion: (param: RawRule) => boolean;
}

export interface CustomSavedObjectsModelVersionMap extends SavedObjectsModelVersionMap {
  [modelVersion: string]: CustomSavedObjectsModelVersion;
}

export const ruleModelVersions: CustomSavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      create: rawRuleSchemaV1,
    },
    isCompatibleWithPreviousVersion: (rawRule) => true,
  },
};

export const getLatestRuleVersion = () => Math.max(...Object.keys(ruleModelVersions).map(Number));

export function getMinimumCompatibleVersion(
  modelVersions: CustomSavedObjectsModelVersionMap,
  version: number,
  rawRule: RawRule
): number {
  if (version === 1) {
    return 1;
  }

  if (modelVersions[version].isCompatibleWithPreviousVersion(rawRule)) {
    return getMinimumCompatibleVersion(modelVersions, version - 1, rawRule);
  }

  return version;
}
