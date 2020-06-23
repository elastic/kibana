/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { AppClient } from './client';
import { ConfigType } from '../config';

interface SetupDependencies {
  getSpaceId?: (request: KibanaRequest) => string | undefined;
  config: ConfigType;
}

export class AppClientFactory {
  private getSpaceId?: SetupDependencies['getSpaceId'];
  private config?: SetupDependencies['config'];

  public setup({ getSpaceId, config }: SetupDependencies) {
    this.getSpaceId = getSpaceId;
    this.config = config;
  }

  public create(request: KibanaRequest): AppClient {
    if (this.config == null) {
      throw new Error(
        'Cannot create AppClient as config is not present. Did you forget to call setup()?'
      );
    }

    const spaceId = this.getSpaceId?.(request) ?? 'default';
    return new AppClient(spaceId, this.config);
  }
}
