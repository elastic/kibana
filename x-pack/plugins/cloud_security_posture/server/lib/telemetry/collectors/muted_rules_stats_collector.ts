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
import type { Logger } from '@kbn/core/server';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import { CspBenchmarkRule } from '../../../../common/types/latest';
import { getCspBenchmarkRulesStatesHandler } from '../../../routes/benchmark_rules/get_states/v1';
import { MutedRulesStats } from './types';

export const getMutedRulesStats = async (
  soClient: SavedObjectsClientContract,
  encryptedSoClient: ISavedObjectsRepository,
  logger: Logger
): Promise<MutedRulesStats[]> => {
  try {
    const benchmarkRulesStates = await getCspBenchmarkRulesStatesHandler(encryptedSoClient);
    const mutedBenchmarkRules = Object.fromEntries(
      Object.entries(benchmarkRulesStates).filter(([_, value]) => value.muted === true)
    );

    const mutedRulesStats = await Promise.all(
      Object.values(mutedBenchmarkRules).map(async (mutedBenchmarkRule) => {
        const cspBenchmarkRulesSo = await soClient.get<CspBenchmarkRule>(
          CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
          mutedBenchmarkRule.rule_id
        );
        const ruleMetadata = cspBenchmarkRulesSo.attributes.metadata;
        if (ruleMetadata) {
          return {
            id: ruleMetadata.id,
            name: ruleMetadata.name,
            benchmark_id: ruleMetadata.benchmark.id,
            benchmark_name: ruleMetadata.benchmark.name,
            benchmark_version: mutedBenchmarkRule.benchmark_version, // The state object may include different benchmark version then the latest one.
            rule_number: ruleMetadata.benchmark.rule_number,
            posture_type: ruleMetadata.benchmark.posture_type,
            section: ruleMetadata.section,
            version: ruleMetadata.version,
          };
        }
        return null;
      })
    );

    return mutedRulesStats.filter(
      (filteredMetadata) => filteredMetadata !== null
    ) as MutedRulesStats[];
  } catch (e) {
    logger.error(`Failed to get rules states stats ${e}`);
    return [];
  }
};
