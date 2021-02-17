/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';

import {
  TRUSTED_APPS_CREATE_API,
  TRUSTED_APPS_DELETE_API,
  TRUSTED_APPS_LIST_API,
  TRUSTED_APPS_SUMMARY_API,
} from '../../../../../common/endpoint/constants';

import {
  DeleteTrustedAppsRequestParams,
  GetTrustedListAppsResponse,
  GetTrustedAppsListRequest,
  PostTrustedAppCreateRequest,
  PostTrustedAppCreateResponse,
  GetTrustedAppsSummaryResponse,
} from '../../../../../common/endpoint/types/trusted_apps';

import { resolvePathVariables } from './utils';

export interface TrustedAppsService {
  getTrustedAppsList(request: GetTrustedAppsListRequest): Promise<GetTrustedListAppsResponse>;
  deleteTrustedApp(request: DeleteTrustedAppsRequestParams): Promise<void>;
  createTrustedApp(request: PostTrustedAppCreateRequest): Promise<PostTrustedAppCreateResponse>;
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

  async createTrustedApp(request: PostTrustedAppCreateRequest) {
    return this.http.post<PostTrustedAppCreateResponse>(TRUSTED_APPS_CREATE_API, {
      body: JSON.stringify(request),
    });
  }

  async getTrustedAppsSummary() {
    return this.http.get<GetTrustedAppsSummaryResponse>(TRUSTED_APPS_SUMMARY_API);
  }
}
