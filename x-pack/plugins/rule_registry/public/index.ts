/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from 'kibana/public';
import { Plugin } from './plugin';

export type { RuleRegistryPublicPluginSetupContract } from './plugin';
export { RuleRegistry } from './rule_registry';
export type { IRuleRegistry, RuleType } from './rule_registry/types';

export const plugin = (context: PluginInitializerContext) => {
  return new Plugin(context);
};
