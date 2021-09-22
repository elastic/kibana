/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { ConfigDeprecation, AddConfigDeprecation } from 'kibana/server';
import type { PublicMethodsOf, RecursiveReadonly } from '@kbn/utility-types';
import { RulesClient as RulesClientClass } from './rules_client';
import { PluginConfigDescriptor, PluginInitializerContext } from '../../../../src/core/server';
import { AlertingPlugin } from './plugin';
import { configSchema } from './config';
import { AlertsConfigType } from './types';

export type RulesClient = PublicMethodsOf<RulesClientClass>;

export type {
  AlertType,
  ActionGroup,
  ActionGroupIdsOf,
  AlertingPlugin,
  AlertExecutorOptions,
  AlertActionParams,
  AlertServices,
  AlertTypeState,
  AlertTypeParams,
  PartialAlert,
  AlertInstanceState,
  AlertInstanceContext,
  AlertingApiRequestHandlerContext,
  RuleParamsAndRefs,
} from './types';
export { DEFAULT_MAX_EPHEMERAL_ACTIONS_PER_ALERT } from './config';
export { PluginSetupContract, PluginStartContract } from './plugin';
export { FindResult } from './rules_client';
export { PublicAlertInstance as AlertInstance } from './alert_instance';
export { parseDuration } from './lib';
export { getEsErrorMessage } from './lib/errors';
export {
  ReadOperations,
  AlertingAuthorizationFilterType,
  AlertingAuthorization,
  WriteOperations,
  AlertingAuthorizationEntity,
} from './authorization';

export const plugin = (initContext: PluginInitializerContext) => new AlertingPlugin(initContext);

// Use a custom copy function here so we can perserve the telemetry provided for the deprecated config
// See https://github.com/elastic/kibana/issues/112585#issuecomment-923715363
function renameFromRootAndTrackDeprecatedUsage(
  {
    renameFromRoot,
  }: {
    renameFromRoot(oldKey: string, newKey: string): ConfigDeprecation;
  },
  oldPath: string,
  newPath: string,
  renamedNewPath?: string
) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: RecursiveReadonly<Record<string, any>>,
    fromPath: string,
    addDeprecation: AddConfigDeprecation
  ) => {
    // const actions = get(settings, fromPath);
    const value = get(settings, oldPath);
    const renameFn = renameFromRoot(oldPath, newPath);

    const result = renameFn(settings, fromPath, addDeprecation);

    // If it is set, make sure we return custom logic to ensure the usage is tracked
    if (value) {
      const unsets = [];
      const sets = [{ path: newPath, value }];
      if (renamedNewPath) {
        sets.push({ path: renamedNewPath, value });
        unsets.push({ path: oldPath });
      }
      return {
        set: sets,
        unset: unsets,
      };
    }

    return result;
  };
}

export const config: PluginConfigDescriptor<AlertsConfigType> = {
  schema: configSchema,
  exposeToUsage: {
    legacyTrackingPurposes: true,
  },
  deprecations: ({ renameFromRoot }) => [
    renameFromRootAndTrackDeprecatedUsage(
      { renameFromRoot },
      'xpack.alerts.healthCheck.interval',
      'xpack.alerting.healthCheck.interval',
      'xpack.alerting.legacyTrackingPurposes.healthCheck.interval'
    ),
    renameFromRootAndTrackDeprecatedUsage(
      { renameFromRoot },
      'xpack.alerts.invalidateApiKeysTask.interval',
      'xpack.alerting.invalidateApiKeysTask.interval',
      'xpack.alerting.legacyTrackingPurposes.invalidateApiKeysTask.interval'
    ),
    renameFromRootAndTrackDeprecatedUsage(
      { renameFromRoot },
      'xpack.alerts.invalidateApiKeysTask.removalDelay',
      'xpack.alerting.invalidateApiKeysTask.removalDelay',
      'xpack.alerting.legacyTrackingPurposes.invalidateApiKeysTask.removalDelay'
    ),
    (settings, fromPath, addDeprecation) => {
      const alerting = get(settings, fromPath);
      if (alerting?.enabled === false || alerting?.enabled === true) {
        addDeprecation({
          message: `"xpack.alerting.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.alerting.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};
