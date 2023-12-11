/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { CspBenchmarkRules } from '../../../../common/types/rules/v3';
import { buildRuleKey, getCspSettings, setRulesStates, updateRulesStates } from './utils';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const bulkActionBenchmarkRulesHandler = async (
  soClient: SavedObjectsClientContract,
  rulesToUpdate: CspBenchmarkRules,
  action: 'mute' | 'unmute',
  logger: Logger
) => {
  const cspSettings = await getCspSettings(soClient, logger);

  const currentRulesStates = cspSettings.rules;
  const ruleKeys = rulesToUpdate.map((rule) =>
    buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
  );
  const newRulesStates = setRulesStates(currentRulesStates, ruleKeys, muteStatesMap[action]);
  const newCspSettings = await updateRulesStates(soClient, newRulesStates);

  return newCspSettings;
};
