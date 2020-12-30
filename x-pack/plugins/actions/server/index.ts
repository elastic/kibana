/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PluginInitializerContext, PluginConfigDescriptor } from '../../../../src/core/server';
import { ActionsPlugin } from './plugin';
import { configSchema } from './config';
import { ActionsClient as ActionsClientClass } from './actions_client';
import { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';
import { ActionsConfigType } from './types';

export type ActionsClient = PublicMethodsOf<ActionsClientClass>;
export type ActionsAuthorization = PublicMethodsOf<ActionsAuthorizationClass>;

export {
  ActionsPlugin,
  ActionResult,
  ActionTypeExecutorOptions,
  ActionType,
  PreConfiguredAction,
} from './types';
export { PluginSetupContract, PluginStartContract } from './plugin';

export { asSavedObjectExecutionSource, asHttpRequestExecutionSource } from './lib';

export const plugin = (initContext: PluginInitializerContext) => new ActionsPlugin(initContext);

export const config: PluginConfigDescriptor<ActionsConfigType> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.actions.whitelistedHosts', 'xpack.actions.allowedHosts'),
  ],
};
