/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Logger,
  SharedGlobalConfig,
  PluginInitializerContext,
  ICustomClusterClient,
} from 'kibana/server';
import url from 'url';
import { estypes } from '@elastic/elasticsearch';
import { MonitoringConfig } from './config';
import { PluginsSetup } from './types';
import { instantiateClient } from './es_client/instantiate_client';
import { mbSafeQuery } from './lib/mb_safe_query';
type GetLogger = (...scopes: string[]) => Logger;

interface InitSetupOptions {
  initializerContext: PluginInitializerContext;
  coreSetup: CoreSetup;
  config: MonitoringConfig;
  getLogger: GetLogger;
  log: Logger;
  legacyConfig: SharedGlobalConfig;
  setupPlugins: PluginsSetup;
  coreStart: CoreStart;
}

export type EndpointTypes =
  | 'search'
  | 'msearch'
  | 'transport.request'
  | 'cluster.putSettings'
  | string;
type ClientParams = estypes.SearchRequest | undefined;

interface IAppGlobals {
  url: string;
  isCloud: boolean;
  monitoringCluster: ICustomClusterClient;
  config: MonitoringConfig;
  getLogger: GetLogger;
  getKeyStoreValue: (key: string, storeValueMethod?: () => unknown) => unknown;
  getLegacyClusterShim: (
    client: ElasticsearchClient,
    endpoint: EndpointTypes,
    params: ClientParams
  ) => any;
}

interface KeyStoreData {
  [key: string]: unknown;
}

const keyStoreData: KeyStoreData = {};
const getKeyStoreValue = (key: string, storeValueMethod?: () => unknown) => {
  const value = keyStoreData[key];
  if ((value === undefined || value == null) && typeof storeValueMethod === 'function') {
    keyStoreData[key] = storeValueMethod();
  }
  return keyStoreData[key];
};

export class Globals {
  private static _app: IAppGlobals;

  public static init(options: InitSetupOptions) {
    const { coreSetup, setupPlugins, coreStart, config, log, getLogger } = options;
    const monitoringCluster = instantiateClient(
      config.ui.elasticsearch,
      log,
      coreStart.elasticsearch.createClient
    );
    const getLegacyClusterShim = async (
      client: ElasticsearchClient,
      endpoint: EndpointTypes,
      params: ClientParams
    ) => {
      await mbSafeQuery(async () => {
        // implicit 'any' unavoidable since TransportRequestPromise is a metamorph type
        const endpointMap: { [key: string]: (params: any) => any } = {
          search: client.search,
          msearch: client.msearch,
          'transport.request': client.transport.request,
          'cluster.putSettings': client.cluster.putSettings,
        };
        const { body: result } = await endpointMap[endpoint](params);
        return result;
      });
    };

    const { protocol, hostname, port } = coreSetup.http.getServerInfo();
    const pathname = coreSetup.http.basePath.serverBasePath;

    Globals._app = {
      url: url.format({ protocol, hostname, port, pathname }),
      isCloud: setupPlugins.cloud?.isCloudEnabled || false,
      monitoringCluster,
      config,
      getLogger,
      getKeyStoreValue,
      getLegacyClusterShim,
    };
  }

  public static get app(): Readonly<IAppGlobals> {
    if (!Globals._app) {
      throw new Error(
        'Stack Monitoring: App globals needs to be initiated with Globals.init(...) before use'
      );
    }
    return Globals._app;
  }

  public static stop() {
    if (Globals._app?.monitoringCluster) {
      Globals._app.monitoringCluster.close();
    }
  }
}
