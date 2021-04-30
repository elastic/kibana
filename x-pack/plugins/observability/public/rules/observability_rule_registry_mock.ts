/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityRuleRegistry } from './create_observability_rule_registry';

const createRuleRegistryMock = () => ({
  registerFormatter: () => {},
});

export const createObservabilityRuleRegistryMock = () =>
  createRuleRegistryMock() as ObservabilityRuleRegistry & ReturnType<typeof createRuleRegistryMock>;
