/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { configSchema, ActionsConfig, CustomHostSettings } from './config';
import { ActionsClient as ActionsClientClass } from './actions_client';
import { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';

export type { IUnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
export { UnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
export type ActionsClient = PublicMethodsOf<ActionsClientClass>;
export type ActionsAuthorization = PublicMethodsOf<ActionsAuthorizationClass>;

export type {
  ActionsPlugin,
  ActionResult,
  ActionTypeExecutorOptions,
  ActionType,
  InMemoryConnector,
  ActionsApiRequestHandlerContext,
} from './types';

export type { ConnectorWithExtraFindData as FindActionResult } from './application/connector/types';

export type { PluginSetupContract, PluginStartContract } from './plugin';

export {
  asSavedObjectExecutionSource,
  asHttpRequestExecutionSource,
  asNotificationExecutionSource,
  getBasicAuthHeader,
} from './lib';
export { ACTION_SAVED_OBJECT_TYPE } from './constants/saved_objects';

export const plugin = async (initContext: PluginInitializerContext) => {
  const { ActionsPlugin } = await import('./plugin');
  return new ActionsPlugin(initContext);
};

export { SubActionConnector } from './sub_action_framework/sub_action_connector';
export { CaseConnector } from './sub_action_framework/case';
export type { ServiceParams } from './sub_action_framework/types';

export const config: PluginConfigDescriptor<ActionsConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    email: { domain_allowlist: true },
  },
  deprecations: ({ renameFromRoot, unused }) => [
    renameFromRoot('xpack.actions.whitelistedHosts', 'xpack.actions.allowedHosts', {
      level: 'warning',
    }),
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      const customHostSettings = actions?.customHostSettings ?? [];
      if (
        customHostSettings.find(
          (customHostSchema: CustomHostSettings) =>
            Object.hasOwn(customHostSchema, 'ssl') &&
            Object.hasOwn(customHostSchema.ssl ?? {}, 'rejectUnauthorized')
        )
      ) {
        addDeprecation({
          level: 'warning',
          configPath: 'xpack.actions.customHostSettings.ssl.rejectUnauthorized',
          message:
            `"xpack.actions.customHostSettings[<index>].ssl.rejectUnauthorized" is deprecated.` +
            `Use "xpack.actions.customHostSettings[<index>].ssl.verificationMode" instead, ` +
            `with the setting "verificationMode:full" eql to "rejectUnauthorized:true", ` +
            `and "verificationMode:none" eql to "rejectUnauthorized:false".`,
          correctiveActions: {
            manualSteps: [
              `Remove "xpack.actions.customHostSettings[<index>].ssl.rejectUnauthorized" from your kibana configs.`,
              `Use "xpack.actions.customHostSettings[<index>].ssl.verificationMode" ` +
                `with the setting "verificationMode:full" eql to "rejectUnauthorized:true", ` +
                `and "verificationMode:none" eql to "rejectUnauthorized:false".`,
            ],
          },
        });
        return {
          unset: [
            {
              path: `xpack.actions.customHostSettings.ssl.rejectUnauthorized`,
            },
          ],
        };
      }
    },
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      if (Object.hasOwn(actions ?? {}, 'rejectUnauthorized')) {
        addDeprecation({
          level: 'warning',
          configPath: `${fromPath}.rejectUnauthorized`,
          message:
            `"xpack.actions.rejectUnauthorized" is deprecated. Use "xpack.actions.ssl.verificationMode" instead, ` +
            `with the setting "verificationMode:full" eql to "rejectUnauthorized:true", ` +
            `and "verificationMode:none" eql to "rejectUnauthorized:false".`,
          correctiveActions: {
            manualSteps: [
              `Remove "xpack.actions.rejectUnauthorized" from your kibana configs.`,
              `Use "xpack.actions.ssl.verificationMode" ` +
                `with the setting "verificationMode:full" eql to "rejectUnauthorized:true", ` +
                `and "verificationMode:none" eql to "rejectUnauthorized:false".`,
            ],
          },
        });
        return {
          unset: [
            {
              path: `xpack.actions.rejectUnauthorized`,
            },
          ],
        };
      }
    },
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      if (Object.hasOwn(actions ?? {}, 'proxyRejectUnauthorizedCertificates')) {
        addDeprecation({
          level: 'warning',
          configPath: `${fromPath}.proxyRejectUnauthorizedCertificates`,
          message:
            `"xpack.actions.proxyRejectUnauthorizedCertificates" is deprecated. Use "xpack.actions.ssl.proxyVerificationMode" instead, ` +
            `with the setting "proxyVerificationMode:full" eql to "rejectUnauthorized:true",` +
            `and "proxyVerificationMode:none" eql to "rejectUnauthorized:false".`,
          correctiveActions: {
            manualSteps: [
              `Remove "xpack.actions.proxyRejectUnauthorizedCertificates" from your kibana configs.`,
              `Use "xpack.actions.ssl.proxyVerificationMode" ` +
                `with the setting "proxyVerificationMode:full" eql to "rejectUnauthorized:true",` +
                `and "proxyVerificationMode:none" eql to "rejectUnauthorized:false".`,
            ],
          },
        });
        return {
          unset: [
            {
              path: `xpack.actions.proxyRejectUnauthorizedCertificates`,
            },
          ],
        };
      }
    },
  ],
};

export { urlAllowListValidator } from './sub_action_framework/helpers';
