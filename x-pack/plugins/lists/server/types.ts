/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContextProvider, RequestHandler } from 'kibana/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';

import { ListClient } from './services/lists/client';

export type ContextProvider = IContextProvider<RequestHandler<unknown, unknown, unknown>, 'lists'>;

export interface PluginsSetup {
  security: SecurityPluginSetup | undefined | null;
  spaces: SpacesPluginSetup | undefined | null;
}

export type ContextProviderReturn = Promise<{ getListClient: () => ListClient }>;
declare module 'src/core/server' {
  interface RequestHandlerContext {
    lists?: {
      getListClient: () => ListClient;
    };
  }
}
