/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CasesUiStart } from '@kbn/cases-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart, SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  RuleTypeParams,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import {
  CustomMetricExpressionParams,
  BaseMetricExpressionParams,
} from '../../../common/custom_threshold_rule/types';
import { ObservabilityPublicStart } from '../../plugin';

export interface AlertContextMeta {
  adHocDataViewList: DataView[];
}

export type MetricExpression = Omit<CustomMetricExpressionParams, 'timeSize' | 'timeUnit'> & {
  timeSize?: BaseMetricExpressionParams['timeSize'];
  timeUnit?: BaseMetricExpressionParams['timeUnit'];
};

export enum AGGREGATION_TYPES {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  RATE = 'rate',
  CARDINALITY = 'cardinality',
  P95 = 'p95',
  P99 = 'p99',
  CUSTOM = 'custom',
}

export interface CustomThresholdAlertParams {
  criteria?: MetricExpression[];
  groupBy?: string | string[];
  filterQuery?: string;
  sourceId?: string;
}

export interface ExpressionChartRow {
  timestamp: number;
  value: number;
}

export type ExpressionChartSeries = ExpressionChartRow[][];

export interface TimeRange {
  from?: string;
  to?: string;
}

export interface AlertParams {
  criteria: MetricExpression[];
  groupBy?: string | string[];
  sourceId: string;
  filterQuery?: string;
  alertOnNoData?: boolean;
  alertOnGroupDisappear?: boolean;
  searchConfiguration: SerializedSearchSourceFields;
  shouldDropPartialBuckets?: boolean;
}

export interface InfraClientStartDeps {
  cases: CasesUiStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable?: EmbeddableStart;
  lens: LensPublicStart;
  // TODO:: check if needed => https://github.com/elastic/kibana/issues/159340
  // ml: MlPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  osquery?: unknown; // OsqueryPluginStart;
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  storage: IStorageWrapper;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionStart;
  // TODO:: check if needed => https://github.com/elastic/kibana/issues/159340
  // telemetry: ITelemetryClient;
}

export type RendererResult = React.ReactElement<any> | null;

export type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

export interface CustomThresholdRuleTypeParams extends RuleTypeParams {
  criteria: CustomMetricExpressionParams[];
  searchConfiguration: SerializedSearchSourceFields;
  groupBy?: string | string[];
}

export const expressionTimestampsRT = rt.type({
  fromTimestamp: rt.number,
  toTimestamp: rt.number,
  interval: rt.string,
  timeFieldName: rt.string,
});
export type ExpressionTimestampsRT = rt.TypeOf<typeof expressionTimestampsRT>;

// Expression options
const aggType = rt.union([
  rt.literal('count'),
  rt.literal('avg'),
  rt.literal('sum'),
  rt.literal('min'),
  rt.literal('max'),
  rt.literal('cardinality'),
]);
export const metricsExplorerCustomMetricRT = rt.intersection([
  rt.type({
    name: rt.string,
    aggregation: aggType,
  }),
  rt.partial({
    field: rt.string,
    filter: rt.string,
  }),
]);
const customThresholdExpressionMetricRT = rt.intersection([
  rt.type({
    aggregation: rt.string,
  }),
  rt.partial({
    field: rt.union([rt.string, rt.undefined]),
    custom_metrics: rt.array(metricsExplorerCustomMetricRT),
    equation: rt.string,
  }),
]);
export const expressionOptionsRT = rt.intersection([
  rt.type({
    aggregation: rt.string,
    metrics: rt.array(customThresholdExpressionMetricRT),
  }),
  rt.partial({
    limit: rt.number,
    groupBy: rt.union([rt.string, rt.array(rt.string)]),
    filterQuery: rt.string,
    source: rt.string,
    forceInterval: rt.boolean,
    dropLastBucket: rt.boolean,
  }),
]);

export type ExpressionOptions = rt.TypeOf<typeof expressionOptionsRT>;
