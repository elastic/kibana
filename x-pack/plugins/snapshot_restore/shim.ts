/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRouter } from '../../server/lib/create_router';
import { registerLicenseChecker } from '../../server/lib/register_license_checker';

export function createShim(server: any, pluginId: string) {
  return {
    core: {
      http: {
        createRouter: (basePath: string) => createRouter(server, pluginId, basePath),
      },
    },
    plugins: {
      license: {
        registerLicenseChecker,
      },
    },
  };
}
