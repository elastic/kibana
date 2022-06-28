/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from '@kbn/core/public';
import { DocLinksStart } from '@kbn/core/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';

import { CloudSetup } from '@kbn/cloud-plugin/public';
import { LicensingPluginStart, ILicense } from '@kbn/licensing-plugin/public';

import { BreadcrumbService } from './application/services/breadcrumbs';

export interface SetupDependencies {
  usageCollection?: UsageCollectionSetup;
  management: ManagementSetup;
  indexManagement?: IndexManagementPluginSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
  home?: HomePublicPluginSetup;
}
export interface StartDependencies {
  licensing: LicensingPluginStart;
}

export interface ClientConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface AppServicesContext {
  breadcrumbService: BreadcrumbService;
  license: ILicense;
  cloud?: CloudSetup;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  docLinks: DocLinksStart;
}
