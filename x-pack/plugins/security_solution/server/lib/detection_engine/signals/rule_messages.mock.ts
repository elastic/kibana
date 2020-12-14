/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildRuleMessageFactory } from './rule_messages';

export const buildRuleMessageMock = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});
