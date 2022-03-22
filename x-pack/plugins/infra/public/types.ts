/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from 'kibana/public';
import { IHttpFetchError } from 'src/core/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { EmbeddableSetup, EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../../../src/plugins/usage_collection/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../plugins/triggers_actions_ui/public';
import type { DataEnhancedSetup, DataEnhancedStart } from '../../data_enhanced/public';
import { MlPluginSetup, MlPluginStart } from '../../ml/public';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '../../observability/public';
// import type { OsqueryPluginStart } from '../../osquery/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type {
  SourceProviderProps,
  UseNodeMetricsTableOptions,
} from './components/infrastructure_node_metrics_tables/shared';

// Our own setup and start contract values
export type InfraClientSetupExports = void;

export interface InfraClientStartExports {
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
  dataEnhanced: DataEnhancedSetup;
  home?: HomePublicPluginSetup;
  observability: ObservabilityPublicSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlPluginSetup;
  embeddable: EmbeddableSetup;
}

export interface InfraClientStartDeps {
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
  observability: ObservabilityPublicStart;
  spaces: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionStart;
  ml: MlPluginStart;
  embeddable?: EmbeddableStart;
  osquery?: unknown; // OsqueryPluginStart;
}

export type InfraClientCoreSetup = CoreSetup<InfraClientStartDeps, InfraClientStartExports>;
export type InfraClientCoreStart = CoreStart;
export type InfraClientPluginClass = PluginClass<
  InfraClientSetupExports,
  InfraClientStartExports,
  InfraClientSetupDeps,
  InfraClientStartDeps
>;

export interface InfraHttpError extends IHttpFetchError {
  readonly body?: {
    statusCode: number;
    message?: string;
  };
}
