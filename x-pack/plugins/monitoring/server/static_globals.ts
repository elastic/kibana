/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, ILegacyCustomClusterClient, Logger } from 'kibana/server';
import url from 'url';
import { CloudSetup } from '../../cloud/server';
import { MonitoringConfig } from './config';

type GetLogger = (...scopes: string[]) => Logger;

interface IAppGlobals {
  url: string;
  isCloud: boolean;
  monitoringCluster: ILegacyCustomClusterClient;
  config: MonitoringConfig;
  getLogger: GetLogger;
  getKeyStoreValue: (key: string, storeValueMethod?: () => unknown) => unknown;
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

  public static init(
    coreSetup: CoreSetup,
    cloud: CloudSetup | undefined,
    monitoringCluster: ILegacyCustomClusterClient,
    config: MonitoringConfig,
    getLogger: GetLogger
  ) {
    const { protocol, hostname, port } = coreSetup.http.getServerInfo();
    const pathname = coreSetup.http.basePath.serverBasePath;
    Globals._app = {
      url: url.format({ protocol, hostname, port, pathname }),
      isCloud: cloud?.isCloudEnabled || false,
      monitoringCluster,
      config,
      getLogger,
      getKeyStoreValue,
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
}
