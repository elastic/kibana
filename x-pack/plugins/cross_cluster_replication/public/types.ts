/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { IndexManagementPluginSetup } from 'x-pack/plugins/index_management/public';
import { RemoteClustersPluginSetup } from 'x-pack/plugins/remote_clusters/public';
import { LicensingPluginSetup } from 'x-pack/plugins/licensing/public';

export interface PluginDependencies {
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  indexManagement: IndexManagementPluginSetup;
  remoteClusters: RemoteClustersPluginSetup;
  licensing: LicensingPluginSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}
