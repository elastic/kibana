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
  RecursiveReadonly,
} from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { SendRequestResponse } from 'src/plugins/es_ui_shared/public';
import { DEFAULT_APP_CATEGORIES, deepFreeze } from '../../../../src/core/utils';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { PLUGIN_ID } from '../common/constants';
import { sendSetup, sendIsInitialized, setHttpClient } from './applications/ingest_manager/hooks';
import { IngestManagerConfigType, CreateFleetSetupResponse } from '../common/types';

export { IngestManagerConfigType } from '../common/types';

/**
 * Describes public IngestManager plugin contract returned at the `setup` stage.
 */
export interface IngestManagerSetup {
  /**
   * Setup initializes the Ingest Manager
   */
  setup: () => Promise<SendRequestResponse<CreateFleetSetupResponse, Error>>;
  /**
   * isInitialized returns whether the Ingest Manager has been initialized
   */
  isInitialized: () => Promise<SendRequestResponse<CreateFleetSetupResponse, Error>>;
}

export type IngestManagerStart = void;

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

  public async setup(
    core: CoreSetup,
    deps: IngestManagerSetupDeps
  ): Promise<RecursiveReadonly<IngestManagerSetup>> {
    const config = this.config;
    setHttpClient(core.http);

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
        const { renderApp } = await import('./applications/ingest_manager');
        return renderApp(coreStart, params, deps, startDeps, config);
      },
    });
    return deepFreeze({
      setup: sendSetup,
      isInitialized: sendIsInitialized,
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
