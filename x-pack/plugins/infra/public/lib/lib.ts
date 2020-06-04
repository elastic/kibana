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
import * as rt from 'io-ts';
import { i18n } from '@kbn/i18n';
import { SourceQuery } from '../graphql/types';
import {
  SnapshotMetricInput,
  SnapshotGroupBy,
  InfraTimerangeInput,
  SnapshotNodeMetric,
  SnapshotNodePath,
} from '../../common/http_api/snapshot_api';
import { WaffleSortOption } from '../pages/metrics/inventory_view/hooks/use_waffle_options';

export interface InfraFrontendLibs {
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
  ip?: string | null;
  path: SnapshotNodePath[];
  metric: SnapshotNodeMetric;
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

export const OperatorRT = rt.keyof({
  gt: null,
  gte: null,
  lt: null,
  lte: null,
  eq: null,
});

export const PALETTES = {
  status: i18n.translate('xpack.infra.legendControls.palettes.status', {
    defaultMessage: 'Status',
  }),
  temperature: i18n.translate('xpack.infra.legendControls.palettes.temperature', {
    defaultMessage: 'Temperature',
  }),
  cool: i18n.translate('xpack.infra.legendControls.palettes.cool', {
    defaultMessage: 'Cool',
  }),
  warm: i18n.translate('xpack.infra.legendControls.palettes.warm', {
    defaultMessage: 'Warm',
  }),
  positive: i18n.translate('xpack.infra.legendControls.palettes.positive', {
    defaultMessage: 'Positive',
  }),
  negative: i18n.translate('xpack.infra.legendControls.palettes.negative', {
    defaultMessage: 'Negative',
  }),
};

export const InventoryColorPaletteRT = rt.keyof(PALETTES);
export type InventoryColorPalette = rt.TypeOf<typeof InventoryColorPaletteRT>;

export const StepRuleRT = rt.intersection([
  rt.type({
    value: rt.number,
    operator: OperatorRT,
    color: rt.string,
  }),
  rt.partial({ label: rt.string }),
]);

export const StepLegendRT = rt.type({
  type: rt.literal('step'),
  rules: rt.array(StepRuleRT),
});
export type InfraWaffleMapStepRule = rt.TypeOf<typeof StepRuleRT>;
export type InfraWaffleMapStepLegend = rt.TypeOf<typeof StepLegendRT>;

export const GradientRuleRT = rt.type({
  value: rt.number,
  color: rt.string,
});

export const GradientLegendRT = rt.type({
  type: rt.literal('gradient'),
  rules: rt.array(GradientRuleRT),
});

export type InfraWaffleMapGradientRule = rt.TypeOf<typeof GradientRuleRT>;
export type InfraWaffleMapGradientLegend = rt.TypeOf<typeof GradientLegendRT>;

export const SteppedGradientLegendRT = rt.type({
  type: rt.literal('steppedGradient'),
  rules: rt.array(GradientRuleRT),
});

export type InfraWaffleMapSteppedGradientLegend = rt.TypeOf<typeof SteppedGradientLegendRT>;

export const LegendRT = rt.union([StepLegendRT, GradientLegendRT, SteppedGradientLegendRT]);
export type InfraWaffleMapLegend = rt.TypeOf<typeof LegendRT>;

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
  metric: SnapshotMetricInput;
  groupBy: SnapshotGroupBy;
  legend: InfraWaffleMapLegend;
  sort: WaffleSortOption;
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

export interface InfraGroupByOptions {
  text: string;
  field: string;
}
