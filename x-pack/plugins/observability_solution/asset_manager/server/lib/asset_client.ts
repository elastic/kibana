/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import { Asset } from '../../common/types_api';
import { GetAssetsOptionsPublic } from '../../common/types_client';
import { getContainers, GetContainersOptions } from './accessors/containers/get_containers';
import { getHosts, GetHostsOptions } from './accessors/hosts/get_hosts';
import { getServices, GetServicesOptions } from './accessors/services/get_services';
import { getPods, GetPodsOptions } from './accessors/pods/get_pods';
import { AssetClientBaseOptions, AssetClientOptionsWithInjectedValues } from './asset_client_types';
import { AssetClientDependencies } from './asset_client_types';

type GetAssetsOptions = GetAssetsOptionsPublic & AssetClientDependencies;

export class AssetClient {
  constructor(private baseOptions: AssetClientBaseOptions) {}

  injectOptions<T extends object = {}>(options: T): AssetClientOptionsWithInjectedValues<T> {
    return {
      ...options,
      ...this.baseOptions,
    };
  }

  async getHosts(options: GetHostsOptions): Promise<{ hosts: Asset[] }> {
    const withInjected = this.injectOptions(options);
    return await getHosts(withInjected);
  }

  async getServices(options: GetServicesOptions): Promise<{ services: Asset[] }> {
    const withInjected = this.injectOptions(options);
    return await getServices(withInjected);
  }

  async getContainers(options: GetContainersOptions): Promise<{ containers: Asset[] }> {
    const withInjected = this.injectOptions(options);
    return await getContainers(withInjected);
  }

  async getPods(options: GetPodsOptions): Promise<{ pods: Asset[] }> {
    const withInjected = this.injectOptions(options);
    return await getPods(withInjected);
  }

  async getAssets(options: GetAssetsOptions): Promise<{ assets: Asset[] }> {
    const withInjected = this.injectOptions(options);
    const { hosts } = await getHosts(withInjected);
    const { services } = await getServices(withInjected);
    return { assets: orderBy(hosts.concat(services), ['@timestamp'], ['desc']) };
  }
}
