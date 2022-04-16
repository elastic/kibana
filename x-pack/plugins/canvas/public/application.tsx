/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Store } from 'redux';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { BehaviorSubject } from 'rxjs';

import { includes, remove } from 'lodash';

import { AppMountParameters, CoreStart, CoreSetup, AppUpdater } from '@kbn/core/public';

import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { PluginServices } from '@kbn/presentation-util-plugin/public';

import { CanvasStartDeps, CanvasSetupDeps } from './plugin';
import { App } from './components/app';
import { SetupRegistries } from './plugin_api';
import { initRegistries, populateRegistries, destroyRegistries } from './registries';
import { HelpMenu } from './components/help_menu/help_menu';
import { createStore } from './store';

import { init as initStatsReporter } from './lib/ui_metric';

import { CapabilitiesStrings } from '../i18n';

import {
  startLegacyServices,
  services,
  LegacyServicesProvider,
  CanvasPluginServices,
  pluginServices as canvasServices,
} from './services';
import { initFunctions } from './functions';
// @ts-expect-error untyped local
import { appUnload } from './state/actions/app';

// @ts-expect-error Not going to convert
import { size } from '../canvas_plugin_src/renderers/plot/plugins/size';
// @ts-expect-error Not going to convert
import { text } from '../canvas_plugin_src/renderers/plot/plugins/text';

import './style/index.scss';

const { ReadOnlyBadge: strings } = CapabilitiesStrings;

export const renderApp = ({
  coreStart,
  startPlugins,
  params,
  canvasStore,
  pluginServices,
}: {
  coreStart: CoreStart;
  startPlugins: CanvasStartDeps;
  params: AppMountParameters;
  canvasStore: Store;
  pluginServices: PluginServices<CanvasPluginServices>;
}) => {
  const { presentationUtil } = startPlugins;
  const { element } = params;
  element.classList.add('canvas');
  element.classList.add('canvasContainerWrapper');
  const ServicesContextProvider = pluginServices.getContextProvider();

  ReactDOM.render(
    <KibanaContextProvider services={{ ...startPlugins, ...coreStart }}>
      <ServicesContextProvider>
        <LegacyServicesProvider providers={services}>
          <presentationUtil.ContextProvider>
            <I18nProvider>
              <KibanaThemeProvider theme$={coreStart.theme.theme$}>
                <Provider store={canvasStore}>
                  <App history={params.history} />
                </Provider>
              </KibanaThemeProvider>
            </I18nProvider>
          </presentationUtil.ContextProvider>
        </LegacyServicesProvider>
      </ServicesContextProvider>
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
  await startLegacyServices(coreSetup, coreStart, setupPlugins, startPlugins, appUpdater);
  const { expressions } = setupPlugins;

  // Adding these functions here instead of in plugin.ts.
  // Some of these functions have deep dependencies into Canvas, which was bulking up the size
  // of our bundle entry point. Moving them here pushes that load to when canvas is actually loaded.
  const canvasFunctions = initFunctions({
    timefilter: setupPlugins.data.query.timefilter.timefilter,
    prependBasePath: coreStart.http.basePath.prepend,
    types: setupPlugins.expressions.getTypes(),
    paletteService: await setupPlugins.charts.palettes.getPalettes(),
  });

  for (const fn of canvasFunctions) {
    expressions.registerFunction(fn);
  }

  // Create Store
  const canvasStore = await createStore(coreSetup);

  // Init Registries
  initRegistries();
  await populateRegistries(registries);

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

  // Setup documentation links
  const { docLinks } = coreStart;
  // Set help extensions
  coreStart.chrome.setHelpExtension({
    appName: i18n.translate('xpack.canvas.helpMenu.appName', {
      defaultMessage: 'Canvas',
    }),
    links: [
      {
        linkType: 'documentation',
        href: docLinks.links.canvas.guide,
      },
    ],
    content: (domNode) => {
      ReactDOM.render(
        <KibanaThemeProvider theme$={coreStart.theme.theme$}>
          <HelpMenu
            functionRegistry={expressions.getFunctions()}
            notifyService={canvasServices.getServices().notify}
          />
        </KibanaThemeProvider>,
        domNode
      );
      return () => ReactDOM.unmountComponentAtNode(domNode);
    },
  });

  if (setupPlugins.usageCollection) {
    initStatsReporter(setupPlugins.usageCollection.reportUiCounter);
  }

  return canvasStore;
};

export const teardownCanvas = (coreStart: CoreStart) => {
  destroyRegistries();

  // Canvas pollutes the jQuery plot plugins collection with custom plugins that only work in Canvas.
  // Remove them when Canvas is unmounted.
  // see: ../canvas_plugin_src/renderers/plot/plugins/index.ts
  if (includes($.plot.plugins, size)) {
    remove($.plot.plugins, size);
  }

  if (includes($.plot.plugins, text)) {
    remove($.plot.plugins, text);
  }

  // TODO: Not cleaning these up temporarily.
  // We have an issue where if requests are inflight, and you navigate away,
  // those requests could still be trying to act on the store and possibly require services.
  // stopServices();
  // resetInterpreter();
  // destroyStore();

  coreStart.chrome.setBadge(undefined);
  coreStart.chrome.setHelpExtension(undefined);
};
