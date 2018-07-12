/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapRequest } from '../../../utils/wrap_request';
import {
  BackendFrameworkAdapter,
  FrameworkInternalUser,
  FrameworkRouteOptions,
  FrameworkWrappableRequest,
} from './adapter_types';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser: FrameworkInternalUser = {
    kind: 'internal',
  };
  public version: string;
  private server: any;
  private cryptoHash: string | null;

  constructor(hapiServer: any) {
    this.server = hapiServer;
    if (hapiServer.plugins.kibana) {
      this.version = hapiServer.plugins.kibana.status.plugin.version;
    } else {
      this.version = 'unknown';
    }
    this.cryptoHash = null;
    this.validateConfig();
  }

  public getSetting(settingPath: string) {
    // TODO type check server properly
    if (settingPath === 'xpack.beats.encryptionKey') {
      // @ts-ignore
      return this.server.config().get(settingPath) || this.cryptoHash;
    }
    // @ts-ignore
    return this.server.config().get(settingPath) || this.cryptoHash;
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      handler: {
        directory: {
          path: dir,
        },
      },
      method: 'GET',
      path: urlPath,
    });
  }

  public registerRoute<
    RouteRequest extends FrameworkWrappableRequest,
    RouteResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    const wrappedHandler = (request: any, reply: any) =>
      route.handler(wrapRequest(request), reply);

    this.server.route({
      handler: wrappedHandler,
      method: route.method,
      path: route.path,
      config: route.config,
    });
  }

  private validateConfig() {
    // @ts-ignore
    const config = this.server.config();
    const encryptionKey = config.get('xpack.beats.encryptionKey');

    if (!encryptionKey) {
      this.server.log(
        'Using a default encryption key for xpack.beats.encryptionKey. It is recommended that you set xpack.beats.encryptionKey in kibana.yml with a unique token'
      );
      this.cryptoHash = 'xpack_beats_default_encryptionKey';
    }
  }
}
