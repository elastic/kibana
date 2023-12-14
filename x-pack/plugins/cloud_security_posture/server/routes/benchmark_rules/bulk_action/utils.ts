/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { CspBenchmarkRulesStates, CspSettings } from '../../../../common/types/rules/v3';

import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

export const updateRulesStates = async (
  encryptedSoClient: SavedObjectsClientContract,
  newRulesStates: CspBenchmarkRulesStates
): Promise<SavedObjectsUpdateResponse<CspSettings>> => {
  return await encryptedSoClient.update<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    { rules: newRulesStates },
    // if there is no saved object yet, insert a new SO
    { upsert: { rules: newRulesStates } }
  );
};

export const setRulesStates = (ruleIds: string[], state: boolean): CspBenchmarkRulesStates => {
  const rulesStates: CspBenchmarkRulesStates = {};
  ruleIds.forEach((ruleId) => {
    rulesStates[ruleId] = { muted: state };
  });
  return rulesStates;
};

export const buildRuleKey = (benchmarkId: string, benchmarkVersion: string, ruleNumber: string) => {
  return `${benchmarkId};${benchmarkVersion};${ruleNumber}`;
};
