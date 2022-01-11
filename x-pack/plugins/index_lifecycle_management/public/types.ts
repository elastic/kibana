/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from 'kibana/public';
import { DocLinksStart } from 'src/core/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { IndexManagementPluginSetup } from '../../index_management/public';
import { SharePluginSetup } from '../../../../src/plugins/share/public';

import { CloudSetup } from '../../cloud/public';
import { LicensingPluginStart, ILicense } from '../../licensing/public';

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
