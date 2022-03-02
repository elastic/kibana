/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializerContext } from '../../../../src/core/server';
import { CspPlugin } from './plugin';

export type { CspServerPluginSetup, CspServerPluginStart } from './types';
export type { cspRuleTemplateAssetType } from './saved_objects/csp_rule_template';

export const plugin = (initializerContext: PluginInitializerContext) =>
  new CspPlugin(initializerContext);

export { config } from './config';
