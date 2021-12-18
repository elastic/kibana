/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from 'kibana/public';

import { IndexLifecycleManagementPlugin } from './plugin';

/** @public */
export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IndexLifecycleManagementPlugin(initializerContext);
};

export type { IlmLocatorParams } from './locator';
export { ILM_LOCATOR_ID } from './locator';
