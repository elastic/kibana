/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';

const createRuleTypeRegistryMock = () => ({
  getFormatter: () => () => 'a reason',
  registerFormatter: () => {},
  list: () => ['ruleType1', 'ruleType2'],
});

export const createObservabilityRuleTypeRegistryMock = () =>
  createRuleTypeRegistryMock() as ObservabilityRuleTypeRegistry &
    ReturnType<typeof createRuleTypeRegistryMock>;
