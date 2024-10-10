/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WriteOperations,
  ReadOperations,
  AlertingAuthorizationEntity,
} from '../../../../authorization';
import { RulesClientContext } from '../../../../rules_client/types';

export async function listRuleTypes(context: RulesClientContext) {
  return await context.authorization.filterByRuleTypeAuthorization(
    context.ruleTypeRegistry.list(),
    [ReadOperations.Get, WriteOperations.Create],
    AlertingAuthorizationEntity.Rule
  );
}
