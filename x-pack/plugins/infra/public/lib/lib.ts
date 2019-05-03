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
  InfraSnapshotMetricInput,
  InfraSnapshotNodeMetric,
  InfraSnapshotNodePath,
  InfraSnapshotGroupbyInput,
  InfraTimerangeInput,
  SourceQuery,
} from '../graphql/types';

export interface InfraFrontendLibs {
  framework: InfraFrameworkAdapter;
  apolloClient: InfraApolloClient;
  observableApi: InfraObservableApi;
}

export type InfraTimezoneProvider = () => string;

export type InfraApolloClient = ApolloClient<NormalizedCacheObject>;

export interface InfraFrameworkAdapter {
  // Insstance vars
  appState?: object;
  kbnVersion?: string;
  timezone?: string;

  // Methods
  setUISettings(key: string, value: any): void;
  render(component: React.ReactElement<any>): void;
  renderBreadcrumbs(component: React.ReactElement<any>): void;
}

export type InfraFramworkAdapterConstructable = new (
  uiModule: IModule,
  timezoneProvider: InfraTimezoneProvider
) => InfraFrameworkAdapter;

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

export interface InfraField {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
}

export type InfraWaffleData = InfraWaffleMapGroup[];

export interface InfraWaffleMapNode {
  pathId: string;
  id: string;
  name: string;
  path: InfraSnapshotNodePath[];
  metric: InfraSnapshotNodeMetric;
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

export interface InfraWaffleMapStepRule {
  value: number;
  operator: InfraWaffleMapRuleOperator;
  color: string;
  label?: string;
}

export interface InfraWaffleMapGradientRule {
  value: number;
  color: string;
}

export enum InfraWaffleMapLegendMode {
  step = 'step',
  gradient = 'gradient',
}

export interface InfraWaffleMapStepLegend {
  type: InfraWaffleMapLegendMode.step;
  rules: InfraWaffleMapStepRule[];
}

export interface InfraWaffleMapGradientLegend {
  type: InfraWaffleMapLegendMode.gradient;
  rules: InfraWaffleMapGradientRule[];
}

export type InfraWaffleMapLegend = InfraWaffleMapStepLegend | InfraWaffleMapGradientLegend;

export enum InfraWaffleMapRuleOperator {
  gt = 'gt',
  gte = 'gte',
  lt = 'lt',
  lte = 'lte',
  eq = 'eq',
}

export interface InfraWaffleMapOptions {
  fields?: SourceQuery.Query['source']['configuration']['fields'] | null;
  formatter: InfraFormatterType;
  formatTemplate: string;
  metric: InfraSnapshotMetricInput;
  groupBy: InfraSnapshotGroupbyInput[];
  legend: InfraWaffleMapLegend;
}

export interface InfraOptions {
  timerange: InfraTimerangeInput;
  wafflemap: InfraWaffleMapOptions;
}

export type Omit<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>>;

export interface InfraWaffleMapBounds {
  min: number;
  max: number;
}

export type InfraFormatter = (value: string | number) => string;
export enum InfraFormatterType {
  number = 'number',
  abbreviatedNumber = 'abbreviatedNumber',
  bytes = 'bytes',
  bits = 'bits',
  percent = 'percent',
}

export enum InfraWaffleMapDataFormat {
  bytesDecimal = 'bytesDecimal',
  bytesBinaryIEC = 'bytesBinaryIEC',
  bytesBinaryJEDEC = 'bytesBinaryJEDEC',
  bitsDecimal = 'bitsDecimal',
  bitsBinaryIEC = 'bitsBinaryIEC',
  bitsBinaryJEDEC = 'bitsBinaryJEDEC',
  abbreviatedNumber = 'abbreviatedNumber',
}

export interface InfraGroupByOptions {
  text: string;
  field: string;
}
