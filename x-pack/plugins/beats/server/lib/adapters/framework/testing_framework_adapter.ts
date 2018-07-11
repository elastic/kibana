/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Client } from 'elasticsearch';
import { get } from 'lodash';
import { FrameworkInternalUser } from './adapter_types';

import {
  BackendFrameworkAdapter,
  FrameworkRequest,
  FrameworkRouteOptions,
  FrameworkWrappableRequest,
} from './adapter_types';

interface TestSettings {
  enrollmentTokensTtlInSeconds: number;
  encryptionKey: string;
}

export class TestingBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser: FrameworkInternalUser = {
    kind: 'internal',
  };
  public version: string;
  private client: Client | null;
  private settings: TestSettings;

  constructor(client: Client | null, settings: TestSettings) {
    this.client = client;
    this.settings = settings || {
      encryptionKey: 'something_who_cares',
      enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
    };
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
    // not yet testable
  }

  public registerRoute<
    RouteRequest extends FrameworkWrappableRequest,
    RouteResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    // not yet testable
  }

  public installIndexTemplate(name: string, template: {}) {
    return;
  }

  public async callWithInternalUser(esMethod: string, options: {}) {
    const api = get<any>(this.client, esMethod);

    api(options);

    return await api(options);
  }

  public async callWithRequest(
    req: FrameworkRequest,
    esMethod: string,
    options: {}
  ) {
    const api = get<any>(this.client, esMethod);

    api(options);

    return await api(options);
  }
}
