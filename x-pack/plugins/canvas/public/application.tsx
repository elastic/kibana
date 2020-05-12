/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store } from 'redux';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';

import { AppMountParameters, CoreStart, CoreSetup, AppUpdater } from 'kibana/public';

import { CanvasStartDeps, CanvasSetupDeps } from './plugin';
// @ts-ignore Untyped local
import { App } from './components/app';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { initInterpreter, resetInterpreter } from './lib/run_interpreter';
import { registerLanguage } from './lib/monaco_language_def';
import { SetupRegistries } from './plugin_api';
import { initRegistries, populateRegistries, destroyRegistries } from './registries';
import { getDocumentationLinks } from './lib/documentation_links';
// @ts-ignore untyped component
import { HelpMenu } from './components/help_menu/help_menu';
import { createStore, destroyStore } from './store';

/* eslint-enable */
import { init as initStatsReporter } from './lib/ui_metric';

import { CapabilitiesStrings } from '../i18n';

import { startServices, stopServices, services } from './services';
// @ts-ignore Untyped local
import { destroyHistory } from './lib/history_provider';
// @ts-ignore Untyped local
import { stopRouter } from './lib/router_provider';

import './style/index.scss';

const { ReadOnlyBadge: strings } = CapabilitiesStrings;

export const renderApp = (
  coreStart: CoreStart,
  plugins: CanvasStartDeps,
  { element }: AppMountParameters,
  canvasStore: Store
) => {
  element.classList.add('canvas');
  element.classList.add('canvasContainerWrapper');
  const canvasServices = Object.entries(services).reduce((reduction, [key, provider]) => {
    reduction[key] = provider.getService();

    return reduction;
  }, {} as Record<string, any>);

  ReactDOM.render(
    <KibanaContextProvider services={{ ...plugins, ...coreStart, canvas: canvasServices }}>
      <I18nProvider>
        <Provider store={canvasStore}>
          <App />
        </Provider>
      </I18nProvider>
    </KibanaContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

export const initializeCanvas = async (
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  setupPlugins: CanvasSetupDeps,
  startPlugins: CanvasStartDeps,
  registries: SetupRegistries,
  appUpdater: BehaviorSubject<AppUpdater>
) => {
  startServices(coreSetup, coreStart, setupPlugins, startPlugins, appUpdater);

  // Create Store
  const canvasStore = await createStore(coreSetup, setupPlugins);

  // Init Interpreter
  initInterpreter(startPlugins.expressions, setupPlugins.expressions).then(() => {
    registerLanguage(Object.values(startPlugins.expressions.getFunctions()));
  });

  // Init Registries
  initRegistries();
  populateRegistries(registries);

  // Set Badge
  coreStart.chrome.setBadge(
    coreStart.application.capabilities.canvas && coreStart.application.capabilities.canvas.save
      ? undefined
      : {
          text: strings.getText(),
          tooltip: strings.getTooltip(),
          iconType: 'glasses',
        }
  );

  // Set help extensions
  coreStart.chrome.setHelpExtension({
    appName: i18n.translate('xpack.canvas.helpMenu.appName', {
      defaultMessage: 'Canvas',
    }),
    links: [
      {
        linkType: 'documentation',
        href: getDocumentationLinks().canvas,
      },
    ],
    content: domNode => {
      ReactDOM.render(<HelpMenu />, domNode);
      return () => ReactDOM.unmountComponentAtNode(domNode);
    },
  });

  if (setupPlugins.usageCollection) {
    initStatsReporter(setupPlugins.usageCollection.reportUiStats);
  }

  return canvasStore;
};

export const teardownCanvas = (coreStart: CoreStart, startPlugins: CanvasStartDeps) => {
  stopServices();
  destroyRegistries();
  resetInterpreter();
  destroyStore();

  coreStart.chrome.setBadge(undefined);
  coreStart.chrome.setHelpExtension(undefined);

  destroyHistory();
  stopRouter();
};
