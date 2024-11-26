/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ManagementSetup } from '@kbn/management-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { CoreStart, ScopedHistory } from '@kbn/core/public';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { BreadcrumbService } from './application/lib/breadcrumbs';
import { ApiService } from './application/lib/api';
import type { FeatureSet } from '../common/types';

export interface KibanaVersionContext {
  /** A string formatted like major.minor.patch of the current stack version */
  currentVersion: string;
  currentMajor: number;
  prevMajor: number;
  nextMajor: number;
}

export interface SetupDependencies {
  management: ManagementSetup;
  share: SharePluginSetup;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionSetup;
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
  data: DataPublicPluginStart;
}

export interface ClientConfigType {
  featureSet: FeatureSet;
  ui: {
    enabled: boolean;
  };
}

export interface AppDependencies {
  kibanaVersionInfo: KibanaVersionContext;
  featureSet: FeatureSet;
  plugins: {
    cloud?: CloudSetup;
    share: SharePluginSetup;
  };
  services: {
    core: CoreStart;
    data: DataPublicPluginStart;
    breadcrumbs: BreadcrumbService;
    history: ScopedHistory;
    api: ApiService;
  };
}
