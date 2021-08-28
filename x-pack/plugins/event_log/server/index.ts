/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '../../../../src/core/server/plugins/types';
import { Plugin } from './plugin';
import type { IEventLogConfig } from './types';
import { ConfigSchema } from './types';

export { ClusterClientAdapter } from './es/cluster_client_adapter';
export { createReadySignal } from './lib/ready_signal';
export {
  IEvent,
  IEventLogClient,
  IEventLogClientService,
  IEventLogger,
  IEventLogService,
  IValidatedEvent,
  QueryEventsBySavedObjectResult,
  SAVED_OBJECT_REL_PRIMARY,
} from './types';

export const config: PluginConfigDescriptor<IEventLogConfig> = {
  schema: ConfigSchema,
  deprecations: () => [
    (settings, fromPath, addDeprecation) => {
      if (
        settings?.xpack?.eventLog?.enabled === false ||
        settings?.xpack?.eventLog?.enabled === true
      ) {
        addDeprecation({
          message: `"xpack.eventLog.enabled" is deprecated. The ability to disable this plugin will be removed in 8.0.0.`,
          correctiveActions: {
            manualSteps: [`Remove "xpack.eventLog.enabled" from your kibana configs.`],
          },
        });
      }
    },
  ],
};
export const plugin = (context: PluginInitializerContext) => new Plugin(context);
