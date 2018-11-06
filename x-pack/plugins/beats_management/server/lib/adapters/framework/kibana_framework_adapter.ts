/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import {
  FrameworkInfo,
  FrameworkRequest,
  internalAuthData,
  RuntimeFrameworkInfo,
} from './adapter_types';
import {
  BackendFrameworkAdapter,
  FrameworkInternalUser,
  FrameworkResponse,
  FrameworkRouteOptions,
  FrameworkWrappableRequest,
} from './adapter_types';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser: FrameworkInternalUser = {
    kind: 'internal',
  };
  public info: null | FrameworkInfo = null;

  private server: any;

  constructor(private readonly PLUGIN_ID: string, hapiServer: any) {
    this.server = hapiServer;

    const xpackMainPlugin = hapiServer.plugins.xpack_main;
    const thisPlugin = hapiServer.plugins.beats_management;

    mirrorPluginStatus(xpackMainPlugin, thisPlugin);
    xpackMainPlugin.status.once('green', () => {
      this.xpackInfoWasUpdatedHandler(xpackMainPlugin.info);
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info
        .feature(this.PLUGIN_ID)
        .registerLicenseCheckResultsGenerator(this.xpackInfoWasUpdatedHandler);
    });
  }

  public on(event: 'xpack.status.green', cb: () => void) {
    switch (event) {
      case 'xpack.status.green':
        this.server.plugins.xpack_main.status.once('green', cb);
    }
  }

  public getSetting(settingPath: string) {
    return this.server.config().get(settingPath);
  }

  public log(text: string) {
    this.server.log(text);
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
    RouteResponse extends FrameworkResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.server.route({
      handler: async (request: any, h: any) => {
        return await route.handler(await this.wrapRequest(request), h);
      },
      method: route.method,
      path: route.path,
      config: route.config,
    });
  }

  private async wrapRequest<InternalRequest extends FrameworkWrappableRequest>(
    req: InternalRequest
  ): Promise<FrameworkRequest<InternalRequest>> {
    const { params, payload, query, headers, info } = req;

    const isAuthenticated = headers.authorization != null;

    return {
      user: isAuthenticated
        ? {
            kind: 'authenticated',
            [internalAuthData]: headers,
            ...(await this.getUser(req)),
          }
        : {
            kind: 'unauthenticated',
          },
      headers,
      info,
      params,
      payload,
      query,
    };
  }

  private async getUser(request: FrameworkWrappableRequest) {
    try {
      return await this.server.plugins.security.getUser(request);
    } catch (e) {
      return null;
    }
  }

  private xpackInfoWasUpdatedHandler(xpackInfo: any) {
    let xpackInfoUnpacked: FrameworkInfo;

    // If, for some reason, we cannot get the license information
    // from Elasticsearch, assume worst case and disable
    if (!xpackInfo || !xpackInfo.isAvailable()) {
      this.info = null;
      return;
    }

    try {
      xpackInfoUnpacked = {
        kibana: {
          version: get(this.server, 'plugins.kibana.status.plugin.version', 'unknown'),
        },
        license: {
          type: xpackInfo.license.getType(),
          expired: !xpackInfo.license.isActive(),
          expiry_date_in_millis: xpackInfo.license.getExpiryDateInMillis(),
        },
        security: {
          enabled: !!xpackInfo.feature('security') && xpackInfo.feature('security').isEnabled(),
          available: !!xpackInfo.feature('security'),
        },
        watcher: {
          enabled: !!xpackInfo.feature('watcher') && xpackInfo.feature('watcher').isEnabled(),
          available: !!xpackInfo.feature('watcher'),
        },
      };
    } catch (e) {
      this.server.log(`Error accessing required xPackInfo in ${this.PLUGIN_ID} Kibana adapter`);
      throw e;
    }

    const assertData = RuntimeFrameworkInfo.decode(xpackInfoUnpacked);
    if (assertData.isLeft()) {
      throw new Error(
        `Error parsing xpack info in ${this.PLUGIN_ID},   ${JSON.stringify(assertData)}`
      );
    }

    this.info = xpackInfoUnpacked;
  }
}
