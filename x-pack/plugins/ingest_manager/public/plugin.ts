/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
} from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { PLUGIN_ID } from '../common/constants';

import { IngestManagerConfigType } from '../common/types';
import { setupRouteService, appRoutesService } from '../common';

export { IngestManagerConfigType } from '../common/types';

export type IngestManagerSetup = void;
/**
 * Describes public IngestManager plugin contract returned at the `start` stage.
 */
export interface IngestManagerStart {
  success: boolean;
  error?: {
    message: string;
  };
}

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  data: DataPublicPluginSetup;
}

export interface IngestManagerStartDeps {
  data: DataPublicPluginStart;
}

export class IngestManagerPlugin
  implements
    Plugin<IngestManagerSetup, IngestManagerStart, IngestManagerSetupDeps, IngestManagerStartDeps> {
  private config: IngestManagerConfigType;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<IngestManagerConfigType>();
  }

  public setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    const config = this.config;
    // Register main Ingest Manager app
    core.application.register({
      id: PLUGIN_ID,
      category: DEFAULT_APP_CATEGORIES.management,
      title: i18n.translate('xpack.ingestManager.appTitle', { defaultMessage: 'Ingest Manager' }),
      euiIconType: 'savedObjectsApp',
      async mount(params: AppMountParameters) {
        const [coreStart, startDeps] = (await core.getStartServices()) as [
          CoreStart,
          IngestManagerStartDeps,
          IngestManagerStart
        ];
        const { renderApp, teardownIngestManager } = await import('./applications/ingest_manager');
        const unmount = renderApp(coreStart, params, deps, startDeps, config);

        return () => {
          unmount();
          teardownIngestManager(coreStart);
        };
      },
    });
  }

  public async start(core: CoreStart): Promise<IngestManagerStart> {
    try {
      const permissionsResponse = await core.http.get(appRoutesService.getCheckPermissionsPath());
      if (permissionsResponse.success) {
        const { isInitialized: success } = await core.http.post(setupRouteService.getSetupPath());
        return { success };
      } else {
        throw new Error(permissionsResponse.error);
      }
    } catch (error) {
      return { success: false, error: { message: error.body?.message || 'Unknown error' } };
    }
  }

  public stop() {}
}
