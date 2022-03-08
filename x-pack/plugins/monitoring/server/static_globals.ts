/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, ElasticsearchClient, Logger, PluginInitializerContext } from 'kibana/server';
import url from 'url';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MonitoringConfig } from './config';
import { PluginsSetup } from './types';
import { mbSafeQuery } from './lib/mb_safe_query';
type GetLogger = (...scopes: string[]) => Logger;

interface InitSetupOptions {
  initializerContext: PluginInitializerContext;
  coreSetup: CoreSetup;
  config: MonitoringConfig;
  getLogger: GetLogger;
  log: Logger;
  setupPlugins: PluginsSetup;
}

export type EndpointTypes =
  | 'search'
  | 'msearch'
  | 'transport.request'
  | 'cluster.putSettings'
  | 'cluster.getSettings'
  | string;
export type ClientParams = estypes.SearchRequest | undefined;

interface IAppGlobals {
  url: string;
  isCloud: boolean;
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
    const { coreSetup, setupPlugins, config, getLogger } = options;
    const getLegacyClusterShim = async (
      client: ElasticsearchClient,
      endpoint: EndpointTypes,
      params: ClientParams
    ): Promise<estypes.SearchResponse> =>
      await mbSafeQuery(async () => {
        const endpointMap: { [key: string]: (params: any) => any } = {
          search: (p) => client.search(p),
          msearch: (p) => client.msearch(p),
          'transport.request': (p) => client.transport.request(p),
          'cluster.getSettings': (p) => client.cluster.getSettings(p),
          'cluster.putSettings': (p) => client.cluster.putSettings(p),
        };
        const body = await endpointMap[endpoint](params);
        return body;
      });

    const { protocol, hostname, port } = coreSetup.http.getServerInfo();
    const pathname = coreSetup.http.basePath.serverBasePath;

    Globals._app = {
      url: url.format({ protocol, hostname, port, pathname }),
      isCloud: setupPlugins.cloud?.isCloudEnabled || false,
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

  public static stop() {}
}
