/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../common/types_api';
import { getHosts, validateGetHostsOptions, GetHostsOptions } from './accessors/hosts';
import { getServices, GetServicesOptions, validateGetServicesOptions } from './accessors/services';
import { AssetClientBaseOptions, AssetClientOptionsWithInjectedValues } from './asset_client_types';

export class AssetClient {
  constructor(private baseOptions: AssetClientBaseOptions) {}

  injectOptions<T extends object = {}>(options: T): AssetClientOptionsWithInjectedValues<T> {
    return {
      ...options,
      ...this.baseOptions,
    };
  }

  async getHosts(options: GetHostsOptions): Promise<{ hosts: Asset[] }> {
    validateGetHostsOptions(options);
    const withInjected = this.injectOptions(options);
    return await getHosts(withInjected);
  }

  async getServices(options: GetServicesOptions): Promise<{ services: Asset[] }> {
    validateGetServicesOptions(options);
    const withInjected = this.injectOptions(options);
    return await getServices(withInjected);
  }
}
