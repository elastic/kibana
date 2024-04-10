/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { editRuleRoute, createRuleRoute } from '../constants';

// TODO: Move this to `packages/kbn-rule-data-utils/src/routes/stack_rule_paths.ts` when
// adding rule form v2 to observability
export const getEditRuleRoute = (ruleId: string) => editRuleRoute.replace(':ruleId', ruleId);
export const getCreateRuleRoute = (ruleTypeId: string) =>
  createRuleRoute.replace(':ruleTypeId', ruleTypeId);
