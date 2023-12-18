/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { CspBenchmarkRules } from '../../../../common/types/rules/v3';
import {
  buildRuleKey,
  getCspSettingsSafe,
  muteDetectionRules,
  setRulesStates,
  updateRulesStates,
} from './utils';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const bulkActionBenchmarkRulesHandler = async (
  soClient: SavedObjectsClientContract,
  encryptedSoClient: SavedObjectsClientContract,
  detectionRulesClient: RulesClient,
  rulesToUpdate: CspBenchmarkRules,
  action: 'mute' | 'unmute',
  logger: Logger
) => {
  const cspSettings = await getCspSettingsSafe(encryptedSoClient, logger);

  const currentRulesStates = cspSettings.rules;
  const rulesKeys = rulesToUpdate.map((rule) =>
    buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
  );
  const newRulesStates = setRulesStates(currentRulesStates, rulesKeys, muteStatesMap[action]);

  const newCspSettings = await updateRulesStates(encryptedSoClient, newRulesStates);

  const rulesIds = rulesToUpdate.map((rule) => rule.rule_id);

  await muteDetectionRules(soClient, detectionRulesClient, rulesIds);

  return newCspSettings;
};
