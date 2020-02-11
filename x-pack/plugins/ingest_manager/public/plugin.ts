/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { PLUGIN_ID } from '../common/constants';
import { IngestManagerConfigType } from '../common/types';

export { IngestManagerConfigType } from '../common/types';

export type IngestManagerSetup = void;
export type IngestManagerStart = void;

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
  data: DataPublicPluginSetup;
}

export class IngestManagerPlugin implements Plugin {
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
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./applications/ingest_manager');
        return renderApp(coreStart, params, deps, config);
      },
    });
  }

  public start(core: CoreStart) {}

  public stop() {}
}
