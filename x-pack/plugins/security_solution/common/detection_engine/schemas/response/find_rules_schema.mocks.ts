/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FindRulesSchema } from './find_rules_schema';
import { getRulesSchemaMock } from './rules_schema.mocks';

export const getFindRulesSchemaMock = (): FindRulesSchema => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getRulesSchemaMock()],
});
