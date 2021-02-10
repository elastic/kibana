/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin as PluginClass } from 'kibana/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import type { EmbeddableSetup } from '../../../../src/plugins/embeddable/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../../../src/plugins/usage_collection/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../plugins/triggers_actions_ui/public';
import type { DataEnhancedSetup, DataEnhancedStart } from '../../data_enhanced/public';
import type {
  ObservabilityPluginSetup,
  ObservabilityPluginStart,
} from '../../observability/public';
import type { SpacesPluginStart } from '../../spaces/public';
import { MlPluginStart, MlPluginSetup } from '../../ml/public';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public';

// Our own setup and start contract values
export type InfraClientSetupExports = void;
export type InfraClientStartExports = void;

export interface InfraClientSetupDeps {
  dataEnhanced: DataEnhancedSetup;
  home?: HomePublicPluginSetup;
  observability: ObservabilityPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  ml: MlPluginSetup;
  embeddable: EmbeddableSetup;
}

export interface InfraClientStartDeps {
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
  observability: ObservabilityPluginStart;
  spaces: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionStart;
  ml: MlPluginStart;
  embeddable?: EmbeddableStart;
}

export type InfraClientCoreSetup = CoreSetup<InfraClientStartDeps, InfraClientStartExports>;
export type InfraClientCoreStart = CoreStart;
export type InfraClientPluginClass = PluginClass<
  InfraClientSetupExports,
  InfraClientStartExports,
  InfraClientSetupDeps,
  InfraClientStartDeps
>;
