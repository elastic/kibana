/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  GetContainersOptionsPublic,
  GetHostsOptionsPublic,
  GetServicesOptionsPublic,
  GetPodsOptionsPublic,
  GetAssetsOptionsPublic,
} from '../../common/types_client';
import {
  GetContainerAssetsResponse,
  GetHostAssetsResponse,
  GetServiceAssetsResponse,
  GetPodAssetsResponse,
  GetAssetsResponse,
} from '../../common/types_api';
import {
  GET_CONTAINERS,
  GET_HOSTS,
  GET_SERVICES,
  GET_PODS,
  GET_ASSETS,
} from '../../common/constants_routes';
import { IPublicAssetsClient } from '../types';

export class PublicAssetsClient implements IPublicAssetsClient {
  constructor(private readonly http: HttpStart) {}

  async getHosts(options: GetHostsOptionsPublic) {
    const { filters, ...otherOptions } = options;
    const results = await this.http.get<GetHostAssetsResponse>(GET_HOSTS, {
      query: {
        stringFilters: JSON.stringify(filters),
        ...otherOptions,
      },
    });

    return results;
  }

  async getContainers(options: GetContainersOptionsPublic) {
    const { filters, ...otherOptions } = options;
    const results = await this.http.get<GetContainerAssetsResponse>(GET_CONTAINERS, {
      query: {
        stringFilters: JSON.stringify(filters),
        ...otherOptions,
      },
    });

    return results;
  }

  async getServices(options: GetServicesOptionsPublic) {
    const { filters, ...otherOptions } = options;
    const results = await this.http.get<GetServiceAssetsResponse>(GET_SERVICES, {
      query: {
        stringFilters: JSON.stringify(filters),
        ...otherOptions,
      },
    });

    return results;
  }

  async getPods(options: GetPodsOptionsPublic) {
    const { filters, ...otherOptions } = options;
    const results = await this.http.get<GetPodAssetsResponse>(GET_PODS, {
      query: {
        stringFilters: JSON.stringify(filters),
        ...otherOptions,
      },
    });

    return results;
  }

  async getAssets(options: GetAssetsOptionsPublic) {
    const { filters, ...otherOptions } = options;
    const results = await this.http.get<GetAssetsResponse>(GET_ASSETS, {
      query: {
        stringFilters: JSON.stringify(filters),
        ...otherOptions,
      },
    });

    return results;
  }
}
