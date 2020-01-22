/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CoreSetup,
  CoreStart,
  Plugin,
  AppMountParameters,
  PluginInitializerContext,
} from 'kibana/public';
import { LicensingPluginSetup } from '../../licensing/public';

export type IngestManagerSetup = void;
export type IngestManagerStart = void;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IngestManagerSetupDeps {}

export interface IngestManagerStartDeps {
  licensing: LicensingPluginSetup;
}

// Redeclare config type as to not reach into server/ code
interface IngestManagerConfigType {
  epm?: {
    enabled?: boolean;
  };
  fleet?: {
    enabled?: boolean;
  };
  agentConfig?: {
    enabled?: boolean;
  };
}

export class IngestManagerPlugin
  implements
    Plugin<IngestManagerSetup, IngestManagerStart, IngestManagerSetupDeps, IngestManagerStartDeps> {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    const config = this.initializerContext.config.get<IngestManagerConfigType>();

    // eslint-disable-next-line no-console
    console.log(`Ingest manager plugin set up. config: ${JSON.stringify(config)}`);
  }

  public setup(core: CoreSetup, plugins: IngestManagerSetupDeps) {
    // Register main Ingest Manager app
    core.application.register({
      id: 'ingest_manager',
      title: 'Ingest Manager',
      appRoute: '/app/ingest',
      euiIconType: 'pipelineApp',
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const { renderApp } = await import('./applications/ingest_manager');
        return renderApp(coreStart, params);
      },
    });
  }

  public start(core: CoreStart, { licensing }: IngestManagerStartDeps) {
    // TODO: check license and disable/enable menu items
    // licensing.license$.subscribe(license => {});
  }

  public stop() {}
}
