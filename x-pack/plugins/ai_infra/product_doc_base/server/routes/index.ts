/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { registerInstallationRoutes } from './installation';
import type { ProductDocInstallClient } from '../services/doc_install_status';
import type { PackageInstaller } from '../services/package_installer';

export const registerRoutes = ({
  router,
  getInstallClient,
  getInstaller,
}: {
  router: IRouter;
  getInstallClient: () => ProductDocInstallClient;
  getInstaller: () => PackageInstaller;
}) => {
  registerInstallationRoutes({ getInstaller, getInstallClient, router });
};
