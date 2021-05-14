/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  PluginConfigDescriptor,
  PluginInitializerContext,
  RequestHandlerContext,
} from 'kibana/server';
import { CasesClient } from './client';
export { CasesClient } from './client';
import { ConfigType, ConfigSchema } from './config';
import { CasePlugin } from './plugin';

export { CaseRequestContext } from './types';
export const config: PluginConfigDescriptor<ConfigType> = {
  schema: ConfigSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.case.enabled', 'xpack.cases.enabled'),
  ],
};
export const plugin = (initializerContext: PluginInitializerContext) =>
  new CasePlugin(initializerContext);

export interface PluginStartContract {
  getCasesClientWithRequestAndContext(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): CasesClient;
}
