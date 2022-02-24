/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { ConfigSchema, IEventLogConfig } from './types';
import { Plugin } from './plugin';

export type {
  IEventLogService,
  IEventLogger,
  IEventLogClientService,
  IEvent,
  IValidatedEvent,
  IEventLogClient,
  QueryEventsBySavedObjectResult,
} from './types';
export { SAVED_OBJECT_REL_PRIMARY } from './types';

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
          configPath: 'xpack.eventLog.enabled',
          title: i18n.translate('xpack.eventLog.deprecations.enabledTitle', {
            defaultMessage: 'Setting "xpack.eventLog.enabled" is deprecated',
          }),
          message: i18n.translate('xpack.eventLog.deprecations.enabledMessage', {
            defaultMessage:
              'This setting will be removed in 8.0 and the Event Log plugin will always be enabled.',
          }),
          correctiveActions: {
            manualSteps: [
              i18n.translate('xpack.eventLog.deprecations.enabled.manualStepOneMessage', {
                defaultMessage: 'Remove "xpack.eventLog.enabled" from kibana.yml.',
              }),
            ],
          },
        });
      }
    },
  ],
};
export const plugin = (context: PluginInitializerContext) => new Plugin(context);
