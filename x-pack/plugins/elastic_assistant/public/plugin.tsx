/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import ReactDOM from 'react-dom';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  ElasticAssistantPluginSetupDependencies,
  ElasticAssistantPluginStartDependencies,
  StartServices,
} from './types';
import { AssistantHeaderLink } from './components/header_link';
import { AssistantProvider } from './provider';
import { ReactQueryClientProvider } from './lib/query_client/query_client_provider';
import { AssistantOverlay } from './components/overlay';
import { licenseService } from './use_assistant_availability/use_license';
import { appContextService } from './services/app_context';

export type ElasticAssistantPublicPluginSetup = ReturnType<ElasticAssistantPublicPlugin['setup']>;
export type ElasticAssistantPublicPluginStart = ReturnType<ElasticAssistantPublicPlugin['start']>;

export class ElasticAssistantPublicPlugin
  implements
    Plugin<
      ElasticAssistantPublicPluginSetup,
      ElasticAssistantPublicPluginStart,
      ElasticAssistantPluginSetupDependencies,
      ElasticAssistantPluginStartDependencies
    >
{
  private readonly kibanaVersion: string;
  private readonly stop$ = new Rx.ReplaySubject<void>(1);
  private storage = new Storage(localStorage);

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart, dependencies: ElasticAssistantPluginStartDependencies) {
    const startServices = (): StartServices => {
      const { ...startPlugins } = core.security;
      licenseService.start(dependencies.licensing.license$);

      const services: StartServices = {
        ...core,
        ...startPlugins,
        storage: this.storage,
        licensing: dependencies.licensing,
        triggersActionsUi: dependencies.triggersActionsUi,
        security: dependencies.security,
      };
      return services;
    };

    core.chrome.navControls.registerRight({
      order: 500,
      mount: (target) => {
        const startService = startServices();
        return this.mountAIAssistantButton(target, core, startService);
      },
    });

    appContextService.start();
    return {};
  }

  public stop() {
    this.stop$.next();
    licenseService.stop();
  }

  private mountAIAssistantButton(
    targetDomElement: HTMLElement,
    coreStart: CoreStart,
    services: StartServices
  ) {
    ReactDOM.render(
      <I18nProvider>
        <KibanaContextProvider
          services={{
            appName: 'securitySolution',
            ...services,
          }}
        >
          <ReactQueryClientProvider>
            <AssistantProvider theme$={coreStart.theme.theme$}>
              <>
                <AssistantHeaderLink />
                <AssistantOverlay />
              </>
            </AssistantProvider>
          </ReactQueryClientProvider>
        </KibanaContextProvider>
      </I18nProvider>,
      targetDomElement
    );

    return () => ReactDOM.unmountComponentAtNode(targetDomElement);
  }
}
