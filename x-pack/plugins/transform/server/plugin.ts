/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, Logger, PluginInitializerContext } from '@kbn/core/server';

import { LicenseType } from '@kbn/licensing-plugin/common/types';

import { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { License } from './services';
import { registerTransformHealthRuleType } from './lib/alerting';

const basicLicense: LicenseType = 'basic';

const PLUGIN = {
  id: 'transform',
  minimumLicenseType: basicLicense,
  getI18nName: (): string =>
    i18n.translate('xpack.transform.appTitle', {
      defaultMessage: 'Transforms',
    }),
};

export class TransformServerPlugin implements Plugin<{}, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
  }

  setup(
    { http, getStartServices, elasticsearch }: CoreSetup,
    { licensing, features, alerting }: Dependencies
  ): {} {
    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.transform.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    features.registerElasticsearchFeature({
      id: PLUGIN.id,
      management: {
        data: [PLUGIN.id],
      },
      catalogue: [PLUGIN.id],
      privileges: [
        {
          requiredClusterPrivileges: ['monitor_transform'],
          ui: [],
        },
      ],
    });

    this.apiRoutes.setup({
      router,
      license: this.license,
    });

    if (alerting) {
      registerTransformHealthRuleType({ alerting, logger: this.logger });
    }

    return {};
  }

  start() {}

  stop() {}
}
