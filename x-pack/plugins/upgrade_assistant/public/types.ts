/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from 'kibana/public';
import { DiscoverStart } from 'src/plugins/discover/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { SharePluginSetup } from 'src/plugins/share/public';
import { CoreStart } from 'src/core/public';
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
}

export interface StartDependencies {
  licensing: LicensingPluginStart;
  discover: DiscoverStart;
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
  };
  services: {
    core: CoreStart;
    discover: DiscoverStart;
    data: DataPublicPluginStart;
    breadcrumbs: BreadcrumbService;
    history: ScopedHistory;
    api: ApiService;
  };
}
