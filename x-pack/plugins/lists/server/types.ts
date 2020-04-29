/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CallAPIOptions, IContextProvider, RequestHandler } from 'kibana/server';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';

import { ListClient } from './services/lists/client';

export type ContextProvider = IContextProvider<RequestHandler<unknown, unknown, unknown>, 'lists'>;

export interface PluginsSetup {
  security: SecurityPluginSetup | undefined | null;
  spaces: SpacesPluginSetup | undefined | null;
}

/**
 * This type is copied from:
 * src/core/server/elasticsearch/scoped_cluster_client.ts
 *
 * Along with the "any" and is the most compatible with the different ways in which
 * alerting and data clients call into the code
 */
export type CallAsCurrentUser = (
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clientParams?: Record<string, any>,
  options?: CallAPIOptions | undefined
) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
Promise<any>;

export type ContextProviderReturn = Promise<{ getListClient: () => ListClient }>;
declare module 'src/core/server' {
  interface RequestHandlerContext {
    lists?: {
      getListClient: () => ListClient;
    };
  }
}
