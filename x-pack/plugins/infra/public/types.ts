/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../plugins/triggers_actions_ui/public';
import { DataEnhancedSetup } from '../../data_enhanced/public';

export interface ClientPluginsSetup {
  dataEnhanced: DataEnhancedSetup;
  home: HomePublicPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface ClientPluginsStart {
  data: DataPublicPluginStart;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export type ClientPluginDeps = ClientPluginsSetup & ClientPluginsStart;
