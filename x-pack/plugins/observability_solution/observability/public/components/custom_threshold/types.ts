/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart, SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { OsqueryPluginStart } from '@kbn/osquery-plugin/public';
import { ALERT_GROUP } from '@kbn/rule-data-utils';
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
  aggType,
  ThresholdParams,
  MetricExpressionParams,
} from '../../../common/custom_threshold_rule/types';
import { ObservabilityPublicStart } from '../../plugin';

export type CustomThresholdPrefillOptions = Partial<
  Omit<ThresholdParams, 'criteria'> & { criteria: Array<Partial<MetricExpressionParams>> }
>;

export interface AlertContextMeta {
  adHocDataViewList: DataView[];
  currentOptions?: CustomThresholdPrefillOptions;
}

export type MetricExpression = Omit<CustomMetricExpressionParams, 'timeSize' | 'timeUnit'> & {
  timeSize?: BaseMetricExpressionParams['timeSize'];
  timeUnit?: BaseMetricExpressionParams['timeUnit'];
};

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
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable?: EmbeddableStart;
  lens: LensPublicStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  osquery?: OsqueryPluginStart;
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  storage: IStorageWrapper;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionStart;
}

export type RendererResult = React.ReactElement<any> | null;

export type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

export interface CustomThresholdRuleTypeParams extends RuleTypeParams {
  criteria: CustomMetricExpressionParams[];
  searchConfiguration: SerializedSearchSourceFields;
  groupBy?: string | string[];
}
export interface CustomThresholdAlertFields {
  [ALERT_GROUP]?: Array<{ field: string; value: string }>;
}

export const expressionTimestampsRT = rt.type({
  fromTimestamp: rt.number,
  toTimestamp: rt.number,
  interval: rt.string,
  timeFieldName: rt.string,
});
export type ExpressionTimestampsRT = rt.TypeOf<typeof expressionTimestampsRT>;

/*
 * Expression options
 */
export const metricsExplorerMetricRT = rt.intersection([
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
    custom_metrics: rt.array(metricsExplorerMetricRT),
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

export type MetricsExplorerMetricRT = rt.TypeOf<typeof metricsExplorerMetricRT>;
export type ExpressionOptions = rt.TypeOf<typeof expressionOptionsRT>;
/*
 * End of expression options
 */

/*
 * Metrics explorer types
 */
export const timeRangeRT = rt.type({
  from: rt.number,
  to: rt.number,
  interval: rt.string,
});

export const afterKeyObjectRT = rt.record(rt.string, rt.union([rt.string, rt.null]));

export const metricsExplorerPageInfoRT = rt.type({
  total: rt.number,
  afterKey: rt.union([rt.string, rt.null, afterKeyObjectRT]),
});

export const metricsExplorerColumnTypeRT = rt.keyof({
  date: null,
  number: null,
  string: null,
});

export const metricsExplorerColumnRT = rt.type({
  name: rt.string,
  type: metricsExplorerColumnTypeRT,
});

export const metricsExplorerRowRT = rt.intersection([
  rt.type({
    timestamp: rt.number,
  }),
  rt.record(
    rt.string,
    rt.union([rt.string, rt.number, rt.null, rt.undefined, rt.array(rt.object)])
  ),
]);

export const metricsExplorerSeriesRT = rt.intersection([
  rt.type({
    id: rt.string,
    columns: rt.array(metricsExplorerColumnRT),
    rows: rt.array(metricsExplorerRowRT),
  }),
  rt.partial({
    keys: rt.array(rt.string),
  }),
]);

export const metricsExplorerResponseRT = rt.type({
  series: rt.array(metricsExplorerSeriesRT),
  pageInfo: metricsExplorerPageInfoRT,
});

export type MetricsExplorerRow = rt.TypeOf<typeof metricsExplorerRowRT>;
export type MetricsExplorerSeries = rt.TypeOf<typeof metricsExplorerSeriesRT>;
export type MetricsExplorerResponse = rt.TypeOf<typeof metricsExplorerResponseRT>;
/*
 * End of metrics explorer types
 */
