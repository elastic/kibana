/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { ConfigSchema } from './types';
import { Plugin } from './plugin';

export {
  IEventLogService,
  IEventLogger,
  IEventLogClientService,
  IEvent,
  IValidatedEvent,
  SAVED_OBJECT_REL_PRIMARY,
} from './types';
export const config = { schema: ConfigSchema };
export const plugin = (context: PluginInitializerContext) => new Plugin(context);
