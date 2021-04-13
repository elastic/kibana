/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { PluginInitializerContext, CoreSetup, Plugin, Logger } from 'kibana/server';

import { PLUGIN_ID, PLUGIN_MIN_LICENSE_TYPE } from '../common/constants';

import { License } from './services';
import { ApiRoutes } from './routes';
import { handleEsError } from './shared_imports';
import { Dependencies } from './types';

export class IngestPipelinesPlugin implements Plugin<void, void, any, any> {
  private readonly logger: Logger;
  private readonly license: License;
  private readonly apiRoutes: ApiRoutes;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get();
    this.license = new License();
    this.apiRoutes = new ApiRoutes();
  }

  public setup({ http }: CoreSetup, { licensing, security, features }: Dependencies) {
    this.logger.debug('ingest_pipelines: setup');

    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN_ID,
        minimumLicenseType: PLUGIN_MIN_LICENSE_TYPE,
        defaultErrorMessage: i18n.translate('xpack.ingestPipelines.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    features.registerElasticsearchFeature({
      id: 'ingest_pipelines',
      management: {
        ingest: ['ingest_pipelines'],
      },
      privileges: [
        {
          ui: [],
          requiredClusterPrivileges: ['manage_pipeline', 'cluster:monitor/nodes/info'],
        },
      ],
    });

    this.apiRoutes.setup({
      router,
      license: this.license,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
      },
      lib: {
        handleEsError,
      },
    });
  }

  public start() {}

  public stop() {}
}
