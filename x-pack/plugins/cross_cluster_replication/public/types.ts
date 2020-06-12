/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { IndexManagementPluginSetup } from '../../index_management/public';
import { RemoteClustersPluginSetup } from '../../remote_clusters/public';
import { LicensingPluginSetup } from '../../licensing/public';

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
