/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from '../../../../src/core/server';
import { ActionsPlugin } from './plugin';
import { configSchema } from './config';

export { ActionsPlugin, ActionResult, ActionTypeExecutorOptions, ActionType } from './types';
export { ActionsClient } from './actions_client';
export { PluginSetupContract, PluginStartContract } from './plugin';

export const plugin = (initContext: PluginInitializerContext) => new ActionsPlugin(initContext);

export const config = {
  schema: configSchema,
};
