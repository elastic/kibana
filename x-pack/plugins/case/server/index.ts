/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/server';
import { ConfigSchema } from './config';
import { CasePlugin } from './plugin';

export { CaseRequestContext } from './types';
export const config = { schema: ConfigSchema };
export const plugin = (initializerContext: PluginInitializerContext) =>
  new CasePlugin(initializerContext);

/**
 * Remove these once the security solution no longer has to access them when registering its plugin
 */
export {
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from './saved_object_types';
