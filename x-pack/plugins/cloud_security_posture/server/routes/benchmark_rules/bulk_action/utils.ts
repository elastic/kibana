/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleParams } from '@kbn/alerting-plugin/server/application/rule/types';
import type {
  CspBenchmarkRule,
  RulesToUpdate,
  CspSettings,
} from '@kbn/cloud-security-posture-common/schema/rules/v4';
import {
  convertRuleTagsToMatchAllKQL,
  generateBenchmarkRuleTags,
} from '../../../../common/utils/detection_rules';

import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

export const getDetectionRuleIdsToDisable = async (
  detectionRules: Array<FindResult<RuleParams>>
) => {
  const idsToDisable = detectionRules
    .map((detectionRule) => {
      return detectionRule.data.map((data) => data.id);
    })
    .flat();
  return idsToDisable;
};

const disableDetectionRules = async (
  detectionRulesClient: RulesClient,
  detectionRules: Array<FindResult<RuleParams>>
): Promise<string[]> => {
  const detectionRulesIdsToDisable = await getDetectionRuleIdsToDisable(detectionRules);
  if (!detectionRulesIdsToDisable.length) return [];
  const uniqueDetectionRulesIdsToDisable = [...new Set(detectionRulesIdsToDisable)]; // Prevent muting the same rule twice.
  await detectionRulesClient.bulkDisableRules({ ids: uniqueDetectionRulesIdsToDisable });
  return uniqueDetectionRulesIdsToDisable;
};

export const getDetectionRules = async (
  detectionRulesClient: RulesClient,
  rulesTags: string[][]
): Promise<Array<FindResult<RuleParams>>> => {
  const detectionRules = Promise.all(
    rulesTags.map(async (ruleTags) => {
      return detectionRulesClient.find({
        excludeFromPublicApi: false,
        options: {
          filter: convertRuleTagsToMatchAllKQL(ruleTags),
          searchFields: ['tags'],
          page: 1,
          perPage: 100, // Disable up to 100 detection rules per benchmark rule at a time
        },
      });
    })
  );

  return detectionRules;
};

export const getBenchmarkRules = async (
  soClient: SavedObjectsClientContract,
  ruleIds: string[]
): Promise<Array<CspBenchmarkRule | undefined>> => {
  const bulkGetObject = ruleIds.map((ruleId) => ({
    id: ruleId,
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  }));
  const cspBenchmarkRulesSo = await soClient.bulkGet<CspBenchmarkRule>(bulkGetObject);

  const benchmarkRules = cspBenchmarkRulesSo.saved_objects.map(
    (cspBenchmarkRule) => cspBenchmarkRule.attributes
  );
  return benchmarkRules;
};

export const muteDetectionRules = async (
  soClient: SavedObjectsClientContract,
  detectionRulesClient: RulesClient,
  rulesIds: string[]
): Promise<string[]> => {
  const benchmarkRules = await getBenchmarkRules(soClient, rulesIds);
  if (benchmarkRules.includes(undefined)) {
    throw new Error('At least one of the provided benchmark rule IDs does not exist');
  }
  const benchmarkRulesTags = benchmarkRules.map((benchmarkRule) =>
    generateBenchmarkRuleTags(benchmarkRule!.metadata)
  );

  const detectionRules = await getDetectionRules(detectionRulesClient, benchmarkRulesTags);

  const disabledDetectionRules = await disableDetectionRules(detectionRulesClient, detectionRules);
  return disabledDetectionRules;
};

export const updateBenchmarkRulesStates = async (
  encryptedSoClient: SavedObjectsClientContract,
  newRulesStates: CspBenchmarkRulesStates
): Promise<CspBenchmarkRulesStates> => {
  if (!Object.keys(newRulesStates).length) {
    return {};
  }

  const response = await encryptedSoClient.update<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    { rules: newRulesStates },
    // if there is no saved object yet, insert a new SO
    { upsert: { rules: newRulesStates } }
  );
  return response.attributes.rules || {};
};

export const setRulesStates = (
  ruleIds: string[],
  state: boolean,
  rulesToUpdate: RulesToUpdate
): CspBenchmarkRulesStates => {
  const rulesStates: CspBenchmarkRulesStates = {};
  ruleIds.forEach((ruleId, index) => {
    const benchmarkRule = rulesToUpdate[index];
    rulesStates[ruleId] = {
      muted: state,
      benchmark_id: benchmarkRule.benchmark_id,
      benchmark_version: benchmarkRule.benchmark_version,
      rule_number: benchmarkRule.rule_number,
      rule_id: benchmarkRule.rule_id,
    };
  });
  return rulesStates;
};
