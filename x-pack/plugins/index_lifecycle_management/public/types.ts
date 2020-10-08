/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { IndexManagementPluginSetup } from '../../index_management/public';

export interface PluginsDependencies {
  usageCollection?: UsageCollectionSetup;
  management: ManagementSetup;
  indexManagement?: IndexManagementPluginSetup;
  home?: HomePublicPluginSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}
