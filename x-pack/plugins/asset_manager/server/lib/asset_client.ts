/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../common/types_api';
import { getHostsByAssets, getHostsBySignals, GetHostsOptions } from './accessors/hosts';
import {
  getServicesByAssets,
  getServicesBySignals,
  GetServicesOptions,
} from './accessors/services';
import {
  AssetClientClassOptions,
  AssetClientOptionsWithInjectedValues,
} from './asset_client_types';

export class AssetClient {
  constructor(private baseOptions: AssetClientClassOptions) {}

  injectOptions<T extends object = {}>(options: T): AssetClientOptionsWithInjectedValues<T> {
    return {
      ...options,
      sourceIndices: this.baseOptions.sourceIndices,
      getApmIndices: this.baseOptions.getApmIndices,
      metricsClient: this.baseOptions.metricsClient,
    };
  }

  async getHosts(options: GetHostsOptions): Promise<{ hosts: Asset[] }> {
    const withInjected = this.injectOptions(options);
    if (this.baseOptions.source === 'assets') {
      return await getHostsByAssets(withInjected);
    } else {
      return await getHostsBySignals(withInjected);
    }
  }

  async getServices(options: GetServicesOptions): Promise<{ services: Asset[] }> {
    const withInjected = this.injectOptions(options);
    if (this.baseOptions.source === 'assets') {
      return await getServicesByAssets(withInjected);
    } else {
      return await getServicesBySignals(withInjected);
    }
  }
}
