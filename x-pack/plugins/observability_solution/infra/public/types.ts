/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDraggable, EuiDragDropContext } from '@elastic/eui';
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
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  LogsSharedClientSetupExports,
  LogsSharedClientStartExports,
} from '@kbn/logs-shared-plugin/public';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { UnwrapPromise } from '../common/utility_types';
import { InventoryViewsServiceStart } from './services/inventory_views';
import { MetricsExplorerViewsServiceStart } from './services/metrics_explorer_views';
import { ITelemetryClient } from './services/telemetry';
import type { InfraLocators } from '../common/locators';

// Our own setup and start contract values
export interface InfraClientSetupExports {
  locators: InfraLocators;
}

export interface InfraClientStartExports {
  inventoryViews: InventoryViewsServiceStart;
  metricsExplorerViews?: MetricsExplorerViewsServiceStart;
  telemetry: ITelemetryClient;
  locators: InfraLocators;
}

export interface InfraClientSetupDeps {
  logsShared: LogsSharedClientSetupExports;
  home?: HomePublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  uiActions: UiActionsSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlPluginSetup;
  embeddable: EmbeddableSetup;
  share: SharePluginSetup;
  lens: LensPublicStart;
  fieldFormats: FieldFormatsSetup;
  licensing: LicensingPluginSetup;
  cloud?: CloudSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
}

export interface InfraClientStartDeps {
  cases: CasesPublicStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
  embeddable?: EmbeddableStart;
  lens: LensPublicStart;
  logsShared: LogsSharedClientStartExports;
  ml: MlPluginStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  osquery?: unknown; // OsqueryPluginStart - can't be imported due to cyclic dependency;
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  storage: IStorageWrapper;
  serverless?: ServerlessPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  usageCollection: UsageCollectionStart;
  telemetry?: ITelemetryClient;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
  licenseManagement?: LicenseManagementUIPluginSetup;
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

export interface ExecutionTimeRange {
  gte: number;
  lte: number;
}

type PropsOf<T> = T extends React.ComponentType<infer ComponentProps> ? ComponentProps : never;
type FirstArgumentOf<Func> = Func extends (arg1: infer FirstArgument, ...rest: any[]) => any
  ? FirstArgument
  : never;
export type DragHandleProps = FirstArgumentOf<
  Exclude<PropsOf<typeof EuiDraggable>['children'], React.ReactElement>
>['dragHandleProps'];
export type DropResult = FirstArgumentOf<FirstArgumentOf<typeof EuiDragDropContext>['onDragEnd']>;
