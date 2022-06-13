/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import { VisualizationsStart } from '@kbn/visualizations-plugin/public';
import { ReportingStart } from '@kbn/reporting-plugin/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  AppMountParameters,
  AppUpdater,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
} from '@kbn/core/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { BfetchPublicSetup } from '@kbn/bfetch-plugin/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { CanvasAppLocatorDefinition } from '../common/locator';
import { SESSIONSTORAGE_LASTPATH, CANVAS_APP } from '../common/lib/constants';
import { getSessionStorage } from './lib/storage';
import { initLoadingIndicator } from './lib/loading_indicator';
import { getPluginApi, CanvasApi } from './plugin_api';
import { setupExpressions } from './setup_expressions';

export type { CoreStart, CoreSetup };

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface CanvasSetupDeps {
  data: DataPublicPluginSetup;
  share: SharePluginSetup;
  expressions: ExpressionsSetup;
  home?: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
  bfetch: BfetchPublicSetup;
  charts: ChartsPluginSetup;
}

export interface CanvasStartDeps {
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  reporting?: ReportingStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  visualizations: VisualizationsStart;
  spaces?: SpacesPluginStart;
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
// These interfaces are empty for now but will be populate as we need to export
// things for other plugins to use at startup or runtime
export type CanvasSetup = CanvasApi;
export type CanvasStart = void;

/** @internal */
export class CanvasPlugin
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps>
{
  private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(coreSetup: CoreSetup<CanvasStartDeps>, setupPlugins: CanvasSetupDeps) {
    const { api: canvasApi, registries } = getPluginApi(setupPlugins.expressions);

    // Set the nav link to the last saved url if we have one in storage
    const lastPath = getSessionStorage().get(
      `${SESSIONSTORAGE_LASTPATH}:${coreSetup.http.basePath.get()}`
    );

    if (lastPath) {
      this.appUpdater.next(() => ({
        defaultPath: `#${lastPath}`,
      }));
    }

    coreSetup.application.register({
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: CANVAS_APP,
      title: 'Canvas',
      euiIconType: 'logoKibana',
      order: 3000,
      updater$: this.appUpdater,
      mount: async (params: AppMountParameters) => {
        const { CanvasSrcPlugin } = await import('../canvas_plugin_src/plugin');
        const srcPlugin = new CanvasSrcPlugin();

        srcPlugin.setup(coreSetup, { canvas: canvasApi });
        setupExpressions({ coreSetup, setupPlugins });

        // Get start services
        const [coreStart, startPlugins] = await coreSetup.getStartServices();

        srcPlugin.start(coreStart, startPlugins);

        const { pluginServices } = await import('./services');
        const { pluginServiceRegistry } = await import('./services/kibana');

        pluginServices.setRegistry(
          pluginServiceRegistry.start({
            coreStart,
            startPlugins,
            appUpdater: this.appUpdater,
            initContext: this.initContext,
          })
        );

        const { expressions, presentationUtil } = startPlugins;
        await presentationUtil.registerExpressionsLanguage(
          Object.values(expressions.getFunctions())
        );

        // Load application bundle
        const { renderApp, initializeCanvas, teardownCanvas } = await import('./application');

        const canvasStore = await initializeCanvas(
          coreSetup,
          coreStart,
          setupPlugins,
          startPlugins,
          registries,
          this.appUpdater
        );

        const unmount = renderApp({ coreStart, startPlugins, params, canvasStore, pluginServices });

        return () => {
          unmount();
          teardownCanvas(coreStart);
        };
      },
    });

    if (setupPlugins.home) {
      setupPlugins.home.featureCatalogue.register(featureCatalogueEntry);
    }

    if (setupPlugins.share) {
      setupPlugins.share.url.locators.create(new CanvasAppLocatorDefinition());
    }

    canvasApi.addArgumentUIs(async () => {
      // @ts-expect-error
      const { argTypeSpecs } = await import('./expression_types/arg_types');
      return argTypeSpecs;
    });

    canvasApi.addTransitions(async () => {
      const { transitions } = await import('./transitions');
      return transitions;
    });

    return {
      ...canvasApi,
    };
  }

  public start(coreStart: CoreStart, startPlugins: CanvasStartDeps) {
    initLoadingIndicator(coreStart.http.addLoadingCountSource);
  }
}
