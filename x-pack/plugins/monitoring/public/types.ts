/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart } from 'kibana/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { TriggersAndActionsUIPublicPluginStart } from '../../triggers_actions_ui/public';
import { KibanaLegacyStart } from '../../../../src/plugins/kibana_legacy/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { MonitoringConfig } from '../server';

export interface MonitoringStartPluginDependencies {
  navigation: NavigationStart;
  data: DataPublicPluginStart;
  kibanaLegacy: KibanaLegacyStart;
  element: HTMLElement;
  core: CoreStart;
  isCloud: boolean;
  pluginInitializerContext: PluginInitializerContext;
  externalConfig: Array<Array<string | number> | Array<string | boolean>>;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  usageCollection: UsageCollectionSetup;
}
