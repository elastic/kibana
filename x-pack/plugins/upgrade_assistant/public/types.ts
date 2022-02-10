/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { ManagementSetup } from 'src/plugins/management/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { SharePluginSetup } from 'src/plugins/share/public';
import { CoreStart, ScopedHistory, CoreTheme } from 'src/core/public';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
import { CloudSetup } from '../../cloud/public';
import { LicensingPluginStart } from '../../licensing/public';
import { BreadcrumbService } from './application/lib/breadcrumbs';
import { ApiService } from './application/lib/api';

export interface KibanaVersionContext {
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
  readonly: boolean;
  ui: {
    enabled: boolean;
  };
}

export interface AppDependencies {
  isReadOnlyMode: boolean;
  kibanaVersionInfo: KibanaVersionContext;
  plugins: {
    cloud?: CloudSetup;
    share: SharePluginSetup;
    infra: object | undefined;
  };
  services: {
    core: CoreStart;
    data: DataPublicPluginStart;
    breadcrumbs: BreadcrumbService;
    history: ScopedHistory;
    api: ApiService;
  };
  theme$: Observable<CoreTheme>;
}
