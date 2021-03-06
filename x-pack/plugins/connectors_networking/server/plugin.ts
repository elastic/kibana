/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
  RequestHandlerContext,
} from '../../../../src/core/server';
import {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '../../encrypted_saved_objects/server';

import {
  PLUGIN_ID,
  ConnectorsNetworkingClient,
  PluginSetupContract,
  PluginStartContract,
  ConnectorOptionsWithId,
} from './types';
import { defineRoutes } from './routes';

import { createConnectorsNetworkingHttpClient } from './http_client';

export interface ConnectorsNetworkingPluginsSetup {
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}
export interface ConnectorsNetworkingPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}

export class ConnectorsNetworkingPlugin
  implements Plugin<PluginSetupContract, PluginStartContract> {
  private readonly logger: Logger;
  private esoCanEncrypt = false;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get(PLUGIN_ID);
  }

  public setup(
    core: CoreSetup<ConnectorsNetworkingPluginsStart>,
    plugins: ConnectorsNetworkingPluginsSetup
  ): PluginSetupContract {
    this.esoCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.esoCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    defineRoutes(core.http.createRouter(), this.logger);

    return {
      getClient: () => createClient(this.logger),
    };
  }

  public start(core: CoreStart, plugins: ConnectorsNetworkingPluginsStart): PluginStartContract {
    return {
      getClient: () => createClient(this.logger),
    };
  }

  public stop() {}
}

// This is faked out now by calling the HTTP client library; this works
// because the ctx is not actually used yet. Eventually this code will
// be replaced with code that uses the Kibana system user or a passed in
// saved object client.  Plugin clients only need the findForUrl() method.
function createClient(logger: Logger): ConnectorsNetworkingClient {
  return {
    async findForUrl(url: string): Promise<ConnectorOptionsWithId | undefined> {
      const ctx: RequestHandlerContext = (null as unknown) as RequestHandlerContext;
      const client = createConnectorsNetworkingHttpClient(ctx, logger);
      return client.findForUrl(url);
    },
  };
}
