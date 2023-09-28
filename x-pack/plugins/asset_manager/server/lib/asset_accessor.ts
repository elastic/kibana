/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMDataAccessConfig } from '@kbn/apm-data-access-plugin/server';
import { MetricsDataClient } from '@kbn/metrics-data-access-plugin/server';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { Asset } from '../../common/types_api';
import { AssetManagerConfig } from '../types';
import { OptionsWithInjectedValues } from './accessors';
import { GetHostsOptions } from './accessors/hosts';
import { GetServicesOptions } from './accessors/services';
import { getHostsByAssets } from './accessors/hosts/get_hosts_by_assets';
import { getHostsBySignals } from './accessors/hosts/get_hosts_by_signals';
import { getServicesByAssets } from './accessors/services/get_services_by_assets';
import { getServicesBySignals } from './accessors/services/get_services_by_signals';

interface AssetAccessorClassOptions {
  sourceIndices: AssetManagerConfig['sourceIndices'];
  source: AssetManagerConfig['lockedSource'];
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMDataAccessConfig['indices']>;
  metricsClient: MetricsDataClient;
}

export class AssetAccessor {
  constructor(private options: AssetAccessorClassOptions) {}

  injectOptions<T extends object = {}>(options: T): OptionsWithInjectedValues<T> {
    return {
      ...options,
      sourceIndices: this.options.sourceIndices,
      getApmIndices: this.options.getApmIndices,
      metricsClient: this.options.metricsClient,
    };
  }

  async getHosts(options: GetHostsOptions): Promise<{ hosts: Asset[] }> {
    const withInjected = this.injectOptions(options);
    if (this.options.source === 'assets') {
      return await getHostsByAssets(withInjected);
    } else {
      return await getHostsBySignals(withInjected);
    }
  }

  async getServices(options: GetServicesOptions): Promise<{ services: Asset[] }> {
    const withInjected = this.injectOptions(options);
    if (this.options.source === 'assets') {
      return await getServicesByAssets(withInjected);
    } else {
      return await getServicesBySignals(withInjected);
    }
  }
}
