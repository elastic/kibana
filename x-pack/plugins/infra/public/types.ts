/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin as PluginClass } from 'kibana/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '../../../../src/plugins/usage_collection/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../plugins/triggers_actions_ui/public';
import { DataEnhancedSetup, DataEnhancedStart } from '../../data_enhanced/public';
import { ObservabilityPluginSetup, ObservabilityPluginStart } from '../../observability/public';

// Our own setup and start contract values
export type InfraClientSetupExports = void;
export type InfraClientStartExports = void;

export interface InfraClientSetupDeps {
  dataEnhanced: DataEnhancedSetup;
  home: HomePublicPluginSetup;
  observability: ObservabilityPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface InfraClientStartDeps {
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
  observability: ObservabilityPluginStart;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionStart;
}

export type InfraClientCoreSetup = CoreSetup<InfraClientStartDeps, InfraClientStartExports>;
export type InfraClientCoreStart = CoreStart;
export type InfraClientPluginClass = PluginClass<
  InfraClientSetupExports,
  InfraClientStartExports,
  InfraClientSetupDeps,
  InfraClientStartDeps
>;
