/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SearchApi } from './services/search';
import { ProductDocInstallClient } from './services/doc_install_status';
import { PackageInstaller } from './services/package_installer';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ProductDocBaseSetupDependencies {}

export interface ProductDocBaseStartDependencies {
  licensing: LicensingPluginStart;
}

export interface ProductDocBaseSetupContract {}

export interface ProductDocBaseStartContract {
  search: SearchApi;
  isInstalled: () => Promise<boolean>;
}

export interface InternalRouteServices {
  installClient: ProductDocInstallClient;
  packageInstaller: PackageInstaller;
  licensing: LicensingPluginStart;
}
