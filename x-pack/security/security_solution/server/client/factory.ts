/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { AppClient } from './client';
import type { ConfigType } from '../config';
import { invariant } from '../../common/utils/invariant';

interface SetupDependencies {
  getSpaceId?: (request: KibanaRequest) => string | undefined;
  config: ConfigType;
  kibanaVersion: string;
  kibanaBranch: string;
}

export class AppClientFactory {
  private getSpaceId?: SetupDependencies['getSpaceId'];
  private config?: SetupDependencies['config'];
  private kibanaVersion?: string;
  private kibanaBranch?: string;

  public setup({ getSpaceId, config, kibanaBranch, kibanaVersion }: SetupDependencies) {
    this.getSpaceId = getSpaceId;
    this.config = config;
    this.kibanaVersion = kibanaVersion;
    this.kibanaBranch = kibanaBranch;
  }

  public create(request: KibanaRequest): AppClient {
    invariant(
      this.config != null,
      'Cannot create AppClient as config is not present. Did you forget to call setup()?'
    );
    invariant(
      this.kibanaVersion != null,
      'Cannot create AppClient as kibanaVersion is not present. Did you forget to call setup()?'
    );
    invariant(
      this.kibanaBranch != null,
      'Cannot create AppClient as kibanaBranch is not present. Did you forget to call setup()?'
    );

    const spaceId = this.getSpaceId?.(request) ?? 'default';
    return new AppClient(spaceId, this.config, this.kibanaVersion, this.kibanaBranch);
  }
}
