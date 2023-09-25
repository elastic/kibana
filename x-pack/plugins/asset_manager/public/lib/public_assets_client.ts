/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { GetHostsOptionsPublic } from '../../common/types_client';
import { GetHostAssetsResponse } from '../../common/types_api';
import { IPublicAssetsClient } from '../types';

export class PublicAssetsClient implements IPublicAssetsClient {
  constructor(private readonly http: HttpStart) {}

  async getHosts(options: GetHostsOptionsPublic) {
    const results = await this.http.get<GetHostAssetsResponse>('/api/asset-manager/assets/hosts', {
      query: {
        ...options,
      },
    });

    return results;
  }
}
