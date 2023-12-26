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
import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleParams } from '@kbn/alerting-plugin/server/application/rule/types';
import type {
  CspBenchmarkRule,
  CspBenchmarkRulesStates,
  CspSettings,
} from '../../../../common/types/rules/v3';
import {
  convertRuleTagsToKQL,
  generateBenchmarkRuleTags,
} from '../../../../common/utils/detection_rules';

import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

export const getRuleIdsToDisable = async (detectionRules: Array<FindResult<RuleParams>>) => {
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
) => {
  const idsToDisable = await getRuleIdsToDisable(detectionRules);
  if (!idsToDisable.length) return;
  return await detectionRulesClient.bulkDisableRules({ ids: idsToDisable });
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
          filter: convertRuleTagsToKQL(ruleTags),
          searchFields: ['tags'],
          page: 1,
          per_page: 1,
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
): Promise<number> => {
  const benchmarkRules = await getBenchmarkRules(soClient, rulesIds);
  if (benchmarkRules.includes(undefined)) {
    throw new Error('At least one of the provided benchmark rule IDs does not exist');
  }
  const benchmarkRulesTags = benchmarkRules.map((benchmarkRule) =>
    generateBenchmarkRuleTags(benchmarkRule!.metadata)
  );

  const detectionRules = await getDetectionRules(detectionRulesClient, benchmarkRulesTags);

  const disabledDetectionRules = await disableDetectionRules(detectionRulesClient, detectionRules);

  return disabledDetectionRules ? disabledDetectionRules.rules.length : 0;
};

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

export const setRulesStates = (
  ruleIds: string[],
  state: boolean,
  benchmarkRules: CspBenchmarkRule[]
): CspBenchmarkRulesStates => {
  const rulesStates: CspBenchmarkRulesStates = {};
  ruleIds.forEach((ruleId, index) => {
    const benchmarkRule = benchmarkRules[index];
    rulesStates[ruleId] = {
      muted: state,
      benchmark_id: benchmarkRule.metadata.benchmark.id,
      benchmark_version: benchmarkRule.metadata.benchmark.version,
      rule_number: benchmarkRule.metadata.benchmark.rule_number || '',
      rule_id: benchmarkRule.metadata.id,
    };
  });
  return rulesStates;
};

export const buildRuleKey = (benchmarkRule: CspBenchmarkRule) => {
  const ruleNumber = benchmarkRule.metadata.benchmark.rule_number;
  return `${benchmarkRule.metadata.benchmark.id};${benchmarkRule.metadata.benchmark.version};${ruleNumber}`;
};
