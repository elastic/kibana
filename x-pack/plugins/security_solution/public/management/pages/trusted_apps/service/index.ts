/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';

import {
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_LIST_API,
} from '../../../../../common/endpoint/constants';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedListAppsResponse,
  GetTrustedAppsListRequest,
} from '../../../../../common/endpoint/types/trusted_apps';

import { resolvePathVariables } from './utils';

export interface TrustedAppsService {
  getTrustedAppsList(request: GetTrustedAppsListRequest): Promise<GetTrustedListAppsResponse>;
  deleteTrustedApp(request: DeleteTrustedAppsRequestParams): Promise<void>;
}

export class TrustedAppsHttpService implements TrustedAppsService {
  constructor(private http: HttpStart) {}

  async getTrustedAppsList(request: GetTrustedAppsListRequest) {
    return this.http.get<GetTrustedListAppsResponse>(TRUSTED_APPS_LIST_API, {
      query: request,
    });
  }

  async deleteTrustedApp(request: DeleteTrustedAppsRequestParams): Promise<void> {
    return this.http.delete<void>(resolvePathVariables(TRUSTED_APPS_DELETE_API, request));
  }
}
