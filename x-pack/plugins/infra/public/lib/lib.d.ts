/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IScope } from 'angular';
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { AxiosRequestConfig } from 'axios';
import React from 'react';
import { Observable } from 'rxjs';
import {
  InfraFilterInput,
  InfraMetricInput,
  InfraNodeMetric,
  InfraNodePath,
  InfraPathInput,
  InfraTimerangeInput,
  MapQuery,
} from '../../common/graphql/types';
import { InfraFieldsDomain } from './domains/fields_domain';

export interface InfraFrontendLibs {
  framework: InfraFrameworkAdapter;
  fields: InfraFieldsDomain;
  api: InfraApiAdapter;
  apolloClient: InfraApolloClient;
  observableApi: InfraObservableApi;
}

export type InfraTimezoneProvider = () => string;

export type InfraApolloClient = ApolloClient<NormalizedCacheObject>;

export interface InfraFrameworkAdapter {
  // Insstance vars
  appState?: object;
  dateFormat?: string;
  kbnVersion?: string;
  scaledDateFormat?: string;
  timezone?: string;

  // Methods
  setUISettings(key: string, value: any): void;
  render(component: React.ReactElement<any>): void;
  renderBreadcrumbs(component: React.ReactElement<any>): void;
}

export interface InfraFramworkAdapterConstructable {
  new (uiModule: IModule, timezoneProvider: InfraTimezoneProvider): InfraFrameworkAdapter;
}

// TODO: replace AxiosRequestConfig with something more defined
export type InfraRequestConfig = AxiosRequestConfig;

export interface InfraApiAdapter {
  get<T>(url: string, config?: InfraRequestConfig | undefined): Promise<T>;
  post(url: string, data?: any, config?: AxiosRequestConfig | undefined): Promise<object>;
  delete(url: string, config?: InfraRequestConfig | undefined): Promise<object>;
  put(url: string, data?: any, config?: InfraRequestConfig | undefined): Promise<object>;
}

export interface InfraObservableApiPostParams<RequestBody extends {} = {}> {
  url: string;
  body?: RequestBody;
}

export type InfraObservableApiResponse<BodyType extends {} = {}> = Observable<{
  status: number;
  response: BodyType;
}>;

export interface InfraObservableApi {
  post<RequestBody extends {} = {}, ResponseBody extends {} = {}>(
    params: InfraObservableApiPostParams<RequestBody>
  ): InfraObservableApiResponse<ResponseBody>;
}

export interface InfraUiKibanaAdapterScope extends IScope {
  breadcrumbs: any[];
  topNavMenu: any[];
}

export interface InfraKibanaUIConfig {
  get(key: string): any;
  set(key: string, value: any): Promise<boolean>;
}

export interface InfraKibanaAdapterServiceRefs {
  config: InfraKibanaUIConfig;
  rootScope: IScope;
}

export type InfraBufferedKibanaServiceCall<ServiceRefs> = (serviceRefs: ServiceRefs) => void;

export interface InfraChrome {
  setRootTemplate(template: string): void;
}

export interface InfraField {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
}

export type InfraWaffleData = InfraWaffleMapGroup[];

export interface InfraWaffleMapNode {
  id: string;
  name: string;
  path: InfraNodePath[];
  metrics: InfraNodeMetric[];
}

export type InfraWaffleMapGroup = InfraWaffleMapGroupOfNodes | InfraWaffleMapGroupOfGroups;

export interface InfraWaffleMapGroupBase {
  id: string;
  name: string;
  count: number;
  width: number;
  squareSize: number;
}

export interface InfraWaffleMapGroupOfGroups extends InfraWaffleMapGroupBase {
  groups: InfraWaffleMapGroupOfNodes[];
}

export interface InfraWaffleMapGroupOfNodes extends InfraWaffleMapGroupBase {
  nodes: InfraWaffleMapNode[];
}

export interface InfraOptions {
  sourceId: string;
  timerange: InfraTimerangeInput;
  filters: InfraFilterInput[];
  metrics: InfraMetricInput[];
  path: InfraPathInput[];
}

export type Omit<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>>;
