/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { PluginInitializerContext, PluginConfigDescriptor } from '../../../../src/core/server';
import { ActionsPlugin } from './plugin';
import { configSchema, ActionsConfig, CustomHostSettings } from './config';
import { ActionsClient as ActionsClientClass } from './actions_client';
import { ActionsAuthorization as ActionsAuthorizationClass } from './authorization/actions_authorization';

export type ActionsClient = PublicMethodsOf<ActionsClientClass>;
export type ActionsAuthorization = PublicMethodsOf<ActionsAuthorizationClass>;

export type {
  ActionsPlugin,
  ActionResult,
  ActionTypeExecutorOptions,
  ActionType,
  PreConfiguredAction,
  ActionsApiRequestHandlerContext,
} from './types';

export type {
  EmailActionTypeId,
  EmailActionParams,
  IndexActionTypeId,
  IndexActionParams,
  PagerDutyActionTypeId,
  PagerDutyActionParams,
  ServerLogActionTypeId,
  ServerLogActionParams,
  SlackActionTypeId,
  SlackActionParams,
  WebhookActionTypeId,
  WebhookActionParams,
  ServiceNowITSMActionTypeId,
  ServiceNowSIRActionTypeId,
  ServiceNowActionParams,
  JiraActionTypeId,
  JiraActionParams,
  ResilientActionTypeId,
  ResilientActionParams,
  TeamsActionTypeId,
  TeamsActionParams,
} from './builtin_action_types';
export type { PluginSetupContract, PluginStartContract } from './plugin';

export { asSavedObjectExecutionSource, asHttpRequestExecutionSource } from './lib';
export { ACTION_SAVED_OBJECT_TYPE } from './constants/saved_objects';

export const plugin = (initContext: PluginInitializerContext) => new ActionsPlugin(initContext);

export const config: PluginConfigDescriptor<ActionsConfig> = {
  schema: configSchema,
  deprecations: ({ renameFromRoot, unused }) => [
    renameFromRoot('xpack.actions.whitelistedHosts', 'xpack.actions.allowedHosts'),
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      const customHostSettings = actions?.customHostSettings ?? [];
      if (
        customHostSettings.find(
          (customHostSchema: CustomHostSettings) =>
            !!customHostSchema.ssl && !!customHostSchema.ssl.rejectUnauthorized
        )
      ) {
        addDeprecation({
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
      }
    },
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      if (!!actions?.rejectUnauthorized) {
        addDeprecation({
          message:
            `"xpack.actions.rejectUnauthorized" is deprecated. Use "xpack.actions.verificationMode" instead, ` +
            `with the setting "verificationMode:full" eql to "rejectUnauthorized:true", ` +
            `and "verificationMode:none" eql to "rejectUnauthorized:false".`,
          correctiveActions: {
            manualSteps: [
              `Remove "xpack.actions.rejectUnauthorized" from your kibana configs.`,
              `Use "xpack.actions.verificationMode" ` +
                `with the setting "verificationMode:full" eql to "rejectUnauthorized:true", ` +
                `and "verificationMode:none" eql to "rejectUnauthorized:false".`,
            ],
          },
        });
      }
    },
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      if (!!actions?.proxyRejectUnauthorizedCertificates) {
        addDeprecation({
          message:
            `"xpack.actions.proxyRejectUnauthorizedCertificates" is deprecated. Use "xpack.actions.proxyVerificationMode" instead, ` +
            `with the setting "proxyVerificationMode:full" eql to "rejectUnauthorized:true",` +
            `and "proxyVerificationMode:none" eql to "rejectUnauthorized:false".`,
          correctiveActions: {
            manualSteps: [
              `Remove "xpack.actions.proxyRejectUnauthorizedCertificates" from your kibana configs.`,
              `Use "xpack.actions.proxyVerificationMode" ` +
                `with the setting "proxyVerificationMode:full" eql to "rejectUnauthorized:true",` +
                `and "proxyVerificationMode:none" eql to "rejectUnauthorized:false".`,
            ],
          },
        });
      }
    },
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      if (actions?.enabled === false || actions?.enabled === true) {
        addDeprecation({
          message: `"xpack.actions.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.actions.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};
