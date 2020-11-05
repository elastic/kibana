/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { IndexManagementPluginSetup } from '../../index_management/public';
import { CloudSetup } from '../../cloud/public';

import { BreadcrumbService } from './application/services/breadcrumbs';

export interface PluginsDependencies {
  usageCollection?: UsageCollectionSetup;
  management: ManagementSetup;
  cloud?: CloudSetup;
  indexManagement?: IndexManagementPluginSetup;
  home?: HomePublicPluginSetup;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface AppServicesContext {
  breadcrumbService: BreadcrumbService;
  cloud?: CloudSetup;
}
