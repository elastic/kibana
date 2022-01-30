/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from 'src/core/server';
import { CIS_BENCHMARK_1_4_1_RULES } from './cis_benchmark_1_4_1_rules';
import { cspRuleAssetSavedObjectType } from '../../../common/schemas/csp_rule';

const benchmarks = [CIS_BENCHMARK_1_4_1_RULES] as const;

export const initializeCspRules = async (client: ISavedObjectsRepository) => {
  const existingRules = await client.find({ type: cspRuleAssetSavedObjectType, perPage: 1 });

  // TODO: version?
  if (existingRules.total !== 0) return;

  for (const benchmark of benchmarks)
    await client.bulkCreate(
      benchmark.map((rule) => ({
        attributes: rule,
        id: rule.id,
        type: cspRuleAssetSavedObjectType,
      }))
    );
};
