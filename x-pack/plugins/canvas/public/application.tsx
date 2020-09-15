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
// @ts-expect-error untyped local
import { App } from './components/app';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { registerLanguage } from './lib/monaco_language_def';
import { SetupRegistries } from './plugin_api';
import { initRegistries, populateRegistries, destroyRegistries } from './registries';
import { getDocumentationLinks } from './lib/documentation_links';
import { HelpMenu } from './components/help_menu/help_menu';
import { createStore } from './store';

import { init as initStatsReporter } from './lib/ui_metric';

import { CapabilitiesStrings } from '../i18n';

import { startServices, services, ServicesProvider } from './services';
// @ts-expect-error untyped local
import { createHistory, destroyHistory } from './lib/history_provider';
// @ts-expect-error untyped local
import { stopRouter } from './lib/router_provider';
import { initFunctions } from './functions';
// @ts-expect-error untyped local
import { appUnload } from './state/actions/app';

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

  ReactDOM.render(
    <KibanaContextProvider services={{ ...plugins, ...coreStart }}>
      <ServicesProvider providers={services}>
        <I18nProvider>
          <Provider store={canvasStore}>
            <App />
          </Provider>
        </I18nProvider>
      </ServicesProvider>
    </KibanaContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
    canvasStore.dispatch(appUnload());
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
  await startServices(coreSetup, coreStart, setupPlugins, startPlugins, appUpdater);

  // Adding these functions here instead of in plugin.ts.
  // Some of these functions have deep dependencies into Canvas, which was bulking up the size
  // of our bundle entry point. Moving them here pushes that load to when canvas is actually loaded.
  const canvasFunctions = initFunctions({
    timefilter: setupPlugins.data.query.timefilter.timefilter,
    prependBasePath: coreSetup.http.basePath.prepend,
    types: setupPlugins.expressions.getTypes(),
  });

  for (const fn of canvasFunctions) {
    services.expressions.getService().registerFunction(fn);
  }

  // Re-initialize our history
  createHistory();

  // Create Store
  const canvasStore = await createStore(coreSetup, setupPlugins);

  registerLanguage(Object.values(services.expressions.getService().getFunctions()));

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
    content: (domNode) => {
      ReactDOM.render(
        <HelpMenu functionRegistry={services.expressions.getService().getFunctions()} />,
        domNode
      );
      return () => ReactDOM.unmountComponentAtNode(domNode);
    },
  });

  if (setupPlugins.usageCollection) {
    initStatsReporter(setupPlugins.usageCollection.reportUiStats);
  }

  return canvasStore;
};

export const teardownCanvas = (coreStart: CoreStart, startPlugins: CanvasStartDeps) => {
  destroyRegistries();

  // TODO: Not cleaning these up temporarily.
  // We have an issue where if requests are inflight, and you navigate away,
  // those requests could still be trying to act on the store and possibly require services.
  // stopServices();
  // resetInterpreter();
  // destroyStore();

  coreStart.chrome.setBadge(undefined);
  coreStart.chrome.setHelpExtension(undefined);

  destroyHistory();
  stopRouter();
};
