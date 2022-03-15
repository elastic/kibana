/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, Logger, PluginInitializerContext } from 'src/core/server';
import { IScopedClusterClient } from 'kibana/server';

import { Index as IndexWithoutIlm } from '../../index_management/common/types';
import { PLUGIN } from '../common/constants';
import { Index } from '../common/types';
import { Dependencies } from './types';
import { registerApiRoutes } from './routes';
import { License } from './services';
import { IndexLifecycleManagementConfig } from './config';
import { handleEsError } from './shared_imports';

const indexLifecycleDataEnricher = async (
  indicesList: IndexWithoutIlm[],
  client: IScopedClusterClient
): Promise<Index[]> => {
  if (!indicesList || !indicesList.length) {
    return [];
  }

  const { indices: ilmIndicesData } = await client.asCurrentUser.ilm.explainLifecycle({
    index: '*',
  });
  // @ts-expect-error IndexLifecyclePolicy is not compatible with IlmExplainLifecycleResponse
  return indicesList.map((index: IndexWithoutIlm) => {
    return {
      ...index,
      ilm: { ...(ilmIndicesData[index.name] || {}) },
    };
  });
};

export class IndexLifecycleManagementServerPlugin implements Plugin<void, void, any, any> {
  private readonly config: IndexLifecycleManagementConfig;
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.license = new License();
  }

  setup({ http }: CoreSetup, { licensing, indexManagement, features }: Dependencies): void {
    const router = http.createRouter();
    const config = this.config;

    this.license.setup(
      {
        pluginId: PLUGIN.ID,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.indexLifecycleMgmt.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    features.registerElasticsearchFeature({
      id: PLUGIN.ID,
      management: {
        data: [PLUGIN.ID],
      },
      catalogue: [PLUGIN.ID],
      privileges: [
        {
          requiredClusterPrivileges: ['manage_ilm'],
          ui: [],
        },
      ],
    });

    registerApiRoutes({
      router,
      config,
      license: this.license,
      lib: {
        handleEsError,
      },
    });

    if (config.ui.enabled) {
      if (indexManagement && indexManagement.indexDataEnricher) {
        indexManagement.indexDataEnricher.add(indexLifecycleDataEnricher);
      }
    }
  }

  start() {}

  stop() {}
}
