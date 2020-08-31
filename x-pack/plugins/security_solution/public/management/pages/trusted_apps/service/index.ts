/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { GetTrustedListAppsResponse } from '../../../../../common/endpoint/types/trusted_apps';

export interface TrustedAppsService {
  getTrustedAppsList(page: number, perPage: number): Promise<GetTrustedListAppsResponse>;
}

export class TrustedAppsHttpService implements TrustedAppsService {
  constructor(private http: HttpStart) {}

  async getTrustedAppsList(page: number, perPage: number): Promise<GetTrustedListAppsResponse> {
    return this.http.get<GetTrustedListAppsResponse>('/api/endpoint/trusted_apps', {
      query: { page, per_page: perPage },
    });
  }
}
