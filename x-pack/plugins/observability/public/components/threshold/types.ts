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
import { TimeUnitChar } from '../../../common/utils/formatters';
import { MetricsExplorerSeries } from '../../../common/threshold_rule/metrics_explorer';
import {
  Comparator,
  CustomMetricExpressionParams,
  MetricExpressionParams,
  MetricsSourceStatus,
  NonCountMetricExpressionParams,
  SnapshotCustomMetricInput,
} from '../../../common/threshold_rule/types';
import { ObservabilityPublicStart } from '../../plugin';
import { MetricsExplorerOptions } from './hooks/use_metrics_explorer_options';

export interface AlertContextMeta {
  adHocDataViewList: DataView[];
  currentOptions?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
}

export type MetricExpression = Omit<
  MetricExpressionParams,
  'metric' | 'timeSize' | 'timeUnit' | 'metrics' | 'equation' | 'customMetrics'
> & {
  metric?: NonCountMetricExpressionParams['metric'];
  customMetrics?: CustomMetricExpressionParams['customMetrics'];
  label?: CustomMetricExpressionParams['label'];
  equation?: CustomMetricExpressionParams['equation'];
  timeSize?: MetricExpressionParams['timeSize'];
  timeUnit?: MetricExpressionParams['timeUnit'];
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

export interface MetricThresholdAlertParams {
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
export interface DerivedIndexPattern {
  fields: MetricsSourceStatus['indexFields'];
  title: string;
}

export const SnapshotMetricTypeKeys = {
  count: null,
  cpu: null,
  diskLatency: null,
  load: null,
  memory: null,
  memoryTotal: null,
  tx: null,
  rx: null,
  logRate: null,
  diskIOReadBytes: null,
  diskIOWriteBytes: null,
  s3TotalRequests: null,
  s3NumberOfObjects: null,
  s3BucketSize: null,
  s3DownloadBytes: null,
  s3UploadBytes: null,
  rdsConnections: null,
  rdsQueriesExecuted: null,
  rdsActiveTransactions: null,
  rdsLatency: null,
  sqsMessagesVisible: null,
  sqsMessagesDelayed: null,
  sqsMessagesSent: null,
  sqsMessagesEmpty: null,
  sqsOldestMessage: null,
  custom: null,
};
export const SnapshotMetricTypeRT = rt.keyof(SnapshotMetricTypeKeys);

export type SnapshotMetricType = rt.TypeOf<typeof SnapshotMetricTypeRT>;
export interface InventoryMetricConditions {
  metric: SnapshotMetricType;
  timeSize: number;
  timeUnit: TimeUnitChar;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
  customMetric?: SnapshotCustomMetricInput;
  warningThreshold?: number[];
  warningComparator?: Comparator;
}

export interface MetricThresholdRuleTypeParams extends RuleTypeParams {
  criteria: MetricExpressionParams[];
  searchConfiguration: SerializedSearchSourceFields;
  groupBy?: string | string[];
}
