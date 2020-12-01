/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExtensionsSetup } from './services';
import { FleetSetup } from '../../fleet/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SharePluginStart } from '../../../../src/plugins/share/public';

export type IndexMgmtMetricsType = 'loaded' | 'click' | 'count';

export interface IndexManagementPluginSetup {
  extensionsService: ExtensionsSetup;
}

export interface SetupDependencies {
  fleet?: FleetSetup;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export interface StartDependencies {
  share: SharePluginStart;
}
