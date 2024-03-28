/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { buildRuleKey } from '../../../../common/utils/rules_states';
import {
  getBenchmarkRules,
  muteDetectionRules,
  setRulesStates,
  updateBenchmarkRulesStates,
} from './utils';
import type {
  BulkActionBenchmarkRulesResponse,
  RulesToUpdate,
} from '../../../../common/types/rules/v4';

const muteStatesMap = {
  mute: true,
  unmute: false,
};

export const bulkActionBenchmarkRulesHandler = async (
  soClient: SavedObjectsClientContract,
  encryptedSoClient: SavedObjectsClientContract,
  detectionRulesClient: RulesClient,
  rulesToUpdate: RulesToUpdate,
  action: 'mute' | 'unmute',
  logger: Logger
): Promise<BulkActionBenchmarkRulesResponse> => {
  const rulesIds = rulesToUpdate.map((rule) => rule.rule_id);

  const benchmarkRules = await getBenchmarkRules(soClient, rulesIds);
  if (benchmarkRules.includes(undefined))
    throw new Error('At least one of the provided benchmark rule IDs does not exist');

  const rulesKeys = rulesToUpdate.map((rule) =>
    buildRuleKey(rule.benchmark_id, rule.benchmark_version, rule.rule_number)
  );
  const newRulesStates = setRulesStates(rulesKeys, muteStatesMap[action], rulesToUpdate);

  const updatedBenchmarkRulesStates = await updateBenchmarkRulesStates(
    encryptedSoClient,
    newRulesStates
  );
  const disabledDetectionRules =
    action === 'mute' ? await muteDetectionRules(soClient, detectionRulesClient, rulesIds) : [];

  return { updatedBenchmarkRulesStates, disabledDetectionRules };
};
