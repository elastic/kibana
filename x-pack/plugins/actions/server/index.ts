/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
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
  FindActionResult,
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
    renameFromRoot('xpack.actions.whitelistedHosts', 'xpack.actions.allowedHosts', {
      level: 'warning',
    }),
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      const customHostSettings = actions?.customHostSettings ?? [];
      if (
        customHostSettings.find(
          (customHostSchema: CustomHostSettings) =>
            customHostSchema.hasOwnProperty('ssl') &&
            customHostSchema.ssl?.hasOwnProperty('rejectUnauthorized')
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
      if (actions?.hasOwnProperty('rejectUnauthorized')) {
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
      if (actions?.hasOwnProperty('proxyRejectUnauthorizedCertificates')) {
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
    (settings, fromPath, addDeprecation) => {
      const actions = get(settings, fromPath);
      if (actions?.enabled === false || actions?.enabled === true) {
        addDeprecation({
          configPath: 'xpack.actions.enabled',
          title: i18n.translate('xpack.actions.deprecations.enabledTitle', {
            defaultMessage: 'Setting "xpack.actions.enabled" is deprecated',
          }),
          message: i18n.translate('xpack.actions.deprecations.enabledMessage', {
            defaultMessage:
              'This setting will be removed in 8.0 and the Actions plugin will always be enabled.',
          }),
          documentationUrl: `https://www.elastic.co/guide/en/kibana/current/alert-action-settings-kb.html#action-settings`,
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.actions.deprecations.enabled.manualStepOneMessage', {
                defaultMessage: 'Remove "xpack.actions.enabled" from kibana.yml.',
              }),
              i18n.translate('xpack.actions.deprecations.enabled.manualStepTwoMessage', {
                defaultMessage:
                  'To disable actions and connectors, use the "xpack.actions.enabledActionTypes" setting.',
              }),
            ],
          },
        });
      }
    },
  ],
};
