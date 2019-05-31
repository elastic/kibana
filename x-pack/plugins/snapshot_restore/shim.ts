/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Legacy } from 'kibana';
import { createRouter, Router } from '../../server/lib/create_router';
import { registerLicenseChecker } from '../../server/lib/register_license_checker';

export interface Core {
  http: {
    createRouter(basePath: string): Router;
  };
  i18n: {
    [i18nPackage: string]: any;
  };
}

export interface Plugins {
  license: {
    registerLicenseChecker: typeof registerLicenseChecker;
  };
  cloud: {
    config: {
      isCloudEnabled: boolean;
    };
  };
  xpack_main: any;
  elasticsearch: any;
}

export function createShim(
  server: Legacy.Server,
  pluginId: string
): { core: Core; plugins: Plugins } {
  return {
    core: {
      http: {
        createRouter: (basePath: string) => createRouter(server, pluginId, basePath),
      },
      i18n,
    },
    plugins: {
      license: {
        registerLicenseChecker,
      },
      cloud: {
        config: {
          isCloudEnabled: get(server.plugins, 'cloud.config.isCloudEnabled', false),
        },
      },
      xpack_main: server.plugins.xpack_main,
      elasticsearch: server.plugins.elasticsearch,
    },
  };
}
