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
import { LicensingPluginSetup } from '../../licensing/public';
import { BASE_PATH } from './applications/ingest_manager/constants';

export type IngestManagerSetup = void;
export type IngestManagerStart = void;

export interface IngestManagerSetupDeps {
  licensing: LicensingPluginSetup;
}

// Redeclare config type as to not reach into server/ code
export interface IngestManagerConfigType {
  epm: {
    enabled: boolean;
  };
  fleet: {
    enabled: boolean;
  };
}

export class IngestManagerPlugin implements Plugin {
  private config: IngestManagerConfigType;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<IngestManagerConfigType>();

    // eslint-disable-next-line no-console
    console.log(`Ingest manager plugin set up. config: ${JSON.stringify(this.config)}`);
  }

  public setup(core: CoreSetup, deps: IngestManagerSetupDeps) {
    const config = this.config;

    // Register main Ingest Manager app
    core.application.register({
      id: 'ingest_manager',
      title: 'Ingest Manager',
      appRoute: BASE_PATH,
      euiIconType: 'pipelineApp',
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
