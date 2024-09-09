/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginStart {}

export interface SearchInferenceEndpointsPluginStartDependencies {
  actions: ActionsPluginStartContract;
}

export * from '../common/types';
