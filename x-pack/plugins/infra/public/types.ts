/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
// import type { OsqueryPluginStart } from '../../osquery/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { type TypedLensByValueInput, LensPublicStart } from '@kbn/lens-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CasesUiStart } from '@kbn/cases-plugin/public';
import type { UnwrapPromise } from '../common/utility_types';
import type {
  SourceProviderProps,
  UseNodeMetricsTableOptions,
} from './components/infrastructure_node_metrics_tables/shared';
import { LogViewsServiceStart } from './services/log_views';
import { ITelemetryClient } from './services/telemetry';

// Our own setup and start contract values
export type InfraClientSetupExports = void;

export interface InfraClientStartExports {
  logViews: LogViewsServiceStart;
  telemetry: ITelemetryClient;
  ContainerMetricsTable: (
    props: UseNodeMetricsTableOptions & Partial<SourceProviderProps>
  ) => JSX.Element;
  HostMetricsTable: (
    props: UseNodeMetricsTableOptions & Partial<SourceProviderProps>
  ) => JSX.Element;
  PodMetricsTable: (
    props: UseNodeMetricsTableOptions & Partial<SourceProviderProps>
  ) => JSX.Element;
}

export interface InfraClientSetupDeps {
  home?: HomePublicPluginSetup;
  observability: ObservabilityPublicSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlPluginSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
  lens: LensPublicStart;
}

export interface InfraClientStartDeps {
  cases: CasesUiStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  embeddable?: EmbeddableStart;
  lens: LensPublicStart;
  ml: MlPluginStart;
  observability: ObservabilityPublicStart;
  osquery?: unknown; // OsqueryPluginStart;
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  storage: IStorageWrapper;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionStart;
  telemetry: ITelemetryClient;
}

export type InfraClientCoreSetup = CoreSetup<InfraClientStartDeps, InfraClientStartExports>;
export type InfraClientCoreStart = CoreStart;
export type InfraClientPluginClass = PluginClass<
  InfraClientSetupExports,
  InfraClientStartExports,
  InfraClientSetupDeps,
  InfraClientStartDeps
>;
export type InfraClientStartServicesAccessor = InfraClientCoreSetup['getStartServices'];
export type InfraClientStartServices = UnwrapPromise<ReturnType<InfraClientStartServicesAccessor>>;

export interface InfraHttpError extends IHttpFetchError {
  readonly body?: {
    statusCode: number;
    message?: string;
  };
}

export type LensAttributes = TypedLensByValueInput['attributes'];

export interface LensOptions {
  breakdownSize: number;
}
