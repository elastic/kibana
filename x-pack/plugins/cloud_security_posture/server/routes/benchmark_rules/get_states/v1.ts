/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ISavedObjectsRepository,
  SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CspBenchmarkRulesStates, CspSettings } from '../../../../common/types/rules/v3';
import {
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

export const createCspSettingObject = async (soClient: SavedObjectsClientContract) => {
  return soClient.create<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    {
      rules: {},
    },
    { id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID }
  );
};

export const getCspBenchmarkRulesStatesHandler = async (
  encryptedSoClient: SavedObjectsClientContract | ISavedObjectsRepository
): Promise<CspBenchmarkRulesStates> => {
  try {
    const getSoResponse = await encryptedSoClient.get<CspSettings>(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID
    );
    return getSoResponse.attributes.rules;
  } catch (err) {
    const error = transformError(err);
    if (error.statusCode === 404) {
      const newCspSettings = await createCspSettingObject(encryptedSoClient);
      return newCspSettings.attributes.rules;
    }

    throw new Error(
      `An error occurred while trying to fetch csp settings: ${error.message}, ${error.statusCode}`
    );
  }
};

export const buildMutedRulesFilter = async (
  encryptedSoClient: ISavedObjectsRepository
): Promise<QueryDslQueryContainer[]> => {
  const rulesStates = await getCspBenchmarkRulesStatesHandler(encryptedSoClient);

  const mustNotFilter = [];
  const mutedRules = Object.fromEntries(
    Object.entries(rulesStates).filter(([key, value]) => value.muted === true)
  );
  for (const key in mutedRules) {
    if (mutedRules.hasOwnProperty(key)) {
      const rule = mutedRules[key];
      const mustNotClause = {
        bool: {
          must: [
            { term: { 'rule.benchmark.id': rule.benchmark_id } },
            { term: { 'rule.benchmark.version': rule.benchmark_version } },
            { term: { 'rule.benchmark.rule_number': rule.rule_number } },
          ],
        },
      };

      mustNotFilter.push(mustNotClause);
    }
  }

  return mustNotFilter;
};
