/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  AggregateEventsBySavedObjectResult,
} from './types';
export { SAVED_OBJECT_REL_PRIMARY } from './types';

export { ClusterClientAdapter } from './es/cluster_client_adapter';

export { createReadySignal } from './lib/ready_signal';

export const config: PluginConfigDescriptor<IEventLogConfig> = {
  schema: ConfigSchema,
};
export const plugin = (context: PluginInitializerContext) => new Plugin(context);
