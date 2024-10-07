/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '../../../common/constants';

import { BenchmarkId } from '../../../common/types_old';
import { getBenchmarkFilter } from '../../../common/utils/helpers';

export const getRulesCountForPolicy = async (
  soClient: SavedObjectsClientContract,
  benchmarkId: BenchmarkId
): Promise<number> => {
  const rules = await soClient.find<CspBenchmarkRule>({
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    filter: getBenchmarkFilter(benchmarkId),
    perPage: 0,
  });

  return rules.total;
};
