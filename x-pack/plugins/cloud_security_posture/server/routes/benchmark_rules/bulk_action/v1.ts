/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { CspBenchmarkRules, CspBenchmarkRulesStates } from '../../../../common/types/rules/v3';
import { buildRuleKey, setRulesStates, updateRulesStates } from './utils';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const bulkActionBenchmarkRulesHandler = async (
  encryptedSoClient: SavedObjectsClientContract,
  rulesToUpdate: CspBenchmarkRules,
  action: 'mute' | 'unmute'
): Promise<CspBenchmarkRulesStates> => {
  const ruleKeys = rulesToUpdate.map((rule) =>
    buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
  );

  const newRulesStates = setRulesStates(ruleKeys, muteStatesMap[action]);

  const newCspSettings = await updateRulesStates(encryptedSoClient, newRulesStates);

  return newCspSettings.attributes.rules!;
};
