/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapRequest } from '../../../utils/wrap_request';
import { FrameworkInternalUser } from './adapter_types';
import {
  BackendFrameworkAdapter,
  FrameworkRouteOptions,
  FrameworkWrappableRequest,
} from './adapter_types';

interface TestSettings {
  enrollmentTokensTtlInSeconds: number;
  encryptionKey: string;
}

export class HapiBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser: FrameworkInternalUser = {
    kind: 'internal',
  };
  public version: string;
  private settings: TestSettings;
  private server: any;

  constructor(
    settings: TestSettings = {
      encryptionKey: 'something_who_cares',
      enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
    },
    hapiServer?: any
  ) {
    this.server = hapiServer;
    this.settings = settings;
    this.version = 'testing';
  }

  public getSetting(settingPath: string) {
    switch (settingPath) {
      case 'xpack.beats.enrollmentTokensTtlInSeconds':
        return this.settings.enrollmentTokensTtlInSeconds;
      case 'xpack.beats.encryptionKey':
        return this.settings.encryptionKey;
    }
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    if (!this.server) {
      throw new Error('Must pass a hapi server into the adapter to use exposeStaticDir');
    }
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

  public registerRoute<RouteRequest extends FrameworkWrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ) {
    if (!this.server) {
      throw new Error('Must pass a hapi server into the adapter to use registerRoute');
    }
    const wrappedHandler = (licenseRequired: boolean) => (request: any, reply: any) => {
      return route.handler(wrapRequest(request), reply);
    };

    this.server.route({
      handler: wrappedHandler(route.licenseRequired || false),
      method: route.method,
      path: route.path,
      config: {
        ...route.config,
        auth: false,
      },
    });
  }

  public async injectRequstForTesting({ method, url, headers, payload }: any) {
    return await this.server.inject({ method, url, headers, payload });
  }
}
