/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import React from 'react';
import { Observable } from 'rxjs';

export interface AppFrontendLibs {
  framework: AppFrameworkAdapter;
  apolloClient: AppApolloClient;
  observableApi: AppObservableApi;
}

export type AppTimezoneProvider = () => string;

export type AppApolloClient = ApolloClient<NormalizedCacheObject>;

export interface AppFrameworkAdapter {
  appState?: object;
  dateFormat?: string;
  kbnVersion?: string;
  scaledDateFormat?: string;
  timezone?: string;

  setUISettings(key: string, value: any): void;
  render(component: React.ReactElement<any>): void;
  renderBreadcrumbs(component: React.ReactElement<any>): void;
}

export interface AppFrameworkAdapterConstructible {
  new (uiModule: IModule, timezoneProvider: AppTimezoneProvider): AppFrameworkAdapter;
}

export interface AppObservableApiPostParams<RequestBody extends {} = {}> {
  url: string;
  body?: RequestBody;
}

export type AppObservableApiResponse<BodyType extends {} = {}> = Observable<{
  status: number;
  response: BodyType;
}>;

export interface AppObservableApi {
  post<RequestBody extends {} = {}, ResponseBody extends {} = {}>(
    params: AppObservableApiPostParams<RequestBody>
  ): AppObservableApiResponse<ResponseBody>;
}

export interface AppUiKibanaAdapterScope extends IScope {
  breadcrumbs: any[];
  topNavMenu: any[];
}

export interface AppKibanaUIConfig {
  get(key: string): any;
  set(key: string, value: any): Promise<boolean>;
}

export interface AppKibanaAdapterServiceRefs {
  config: AppKibanaUIConfig;
  rootScope: IScope;
}

export type AppBufferedKibanaServiceCall<ServiceRefs> = (serviceRefs: ServiceRefs) => void;
