/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { ConfigSchema, IEventLogConfig } from './types';
import { Plugin } from './plugin';

export {
  IEventLogService,
  IEventLogger,
  IEventLogClientService,
  IEvent,
  IValidatedEvent,
  IEventLogClient,
  QueryEventsBySavedObjectResult,
  SAVED_OBJECT_REL_PRIMARY,
} from './types';

export { ClusterClientAdapter } from './es/cluster_client_adapter';

export { createReadySignal } from './lib/ready_signal';

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
