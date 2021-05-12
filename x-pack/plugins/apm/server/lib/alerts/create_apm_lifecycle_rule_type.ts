/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import { APMRuleRegistry } from '../../plugin';

export const createAPMLifecycleRuleType = createLifecycleRuleTypeFactory<APMRuleRegistry>();
