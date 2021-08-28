/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { IHttpFetchError } from '../../../../src/core/public/http/types';
import type { Plugin as PluginClass } from '../../../../src/core/public/plugins/plugin';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import type {
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../../src/plugins/embeddable/public/plugin';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public/plugin';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../../../src/plugins/usage_collection/public/plugin';
import type { DataEnhancedSetup, DataEnhancedStart } from '../../data_enhanced/public/plugin';
import type { MlPluginSetup, MlPluginStart } from '../../ml/public/plugin';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '../../observability/public/plugin';
import type { SpacesPluginStart } from '../../spaces/public/plugin';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public/plugin';

// import type { OsqueryPluginStart } from '../../osquery/public';
// Our own setup and start contract values
export type InfraClientSetupExports = void;
export type InfraClientStartExports = void;

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
