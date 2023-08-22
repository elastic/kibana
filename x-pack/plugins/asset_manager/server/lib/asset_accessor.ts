/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../common/types_api';
import { AssetManagerConfig } from '../types';
import { OptionsWithInjectedValues } from './accessors';
import { GetHostsOptions } from './accessors/hosts';
import { getHostsByAssets } from './accessors/hosts/get_hosts_by_assets';
import { getHostsBySignals } from './accessors/hosts/get_hosts_by_signals';

interface AssetAccessorClassOptions {
  sourceIndices: AssetManagerConfig['sourceIndices'];
  source: AssetManagerConfig['lockedSource'];
}

export class AssetAccessor {
  constructor(private options: AssetAccessorClassOptions) {}

  injectOptions<T extends object = {}>(options: T): OptionsWithInjectedValues<T> {
    return {
      ...options,
      sourceIndices: this.options.sourceIndices,
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
}
