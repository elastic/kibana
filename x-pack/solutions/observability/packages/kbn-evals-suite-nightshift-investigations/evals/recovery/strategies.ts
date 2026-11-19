/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The strategies are the checklist the online evals score a recovery round against; the eval suite
// scores the same list, so the two agree.
export {
  CAUSAL_STRATEGIES,
  CAUSAL_STRATEGY_IDS,
  checklistScore,
} from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/strategies';
export type {
  CausalStrategy,
  StrategyStatus,
} from '@kbn/nightshift-investigations-plugin/server/online_evals/judges/recovery_due_diligence/strategies';
