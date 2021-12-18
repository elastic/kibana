/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExtensionsSetup } from './services';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SharePluginStart } from '../../../../src/plugins/share/public';

export interface IndexManagementPluginSetup {
  extensionsService: ExtensionsSetup;
}

export interface SetupDependencies {
  fleet?: unknown;
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export interface StartDependencies {
  share: SharePluginStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}
