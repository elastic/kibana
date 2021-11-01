/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from 'src/plugins/discover/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { CloudSetup } from '../../cloud/public';
import { LicensingPluginStart } from '../../licensing/public';

export interface AppServicesContext {
  cloud?: CloudSetup;
  discover: DiscoverStart;
  data: DataPublicPluginStart;
}

export interface SetupDependencies {
  management: ManagementSetup;
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
