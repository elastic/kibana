/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'kibana/public';

import { IndexLifecycleManagementPlugin } from './plugin';

/** @public */
export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IndexLifecycleManagementPlugin(initializerContext);
};

export { ILM_URL_GENERATOR_ID, IlmUrlGeneratorState } from './url_generator';
