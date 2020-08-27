/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  AppMountParameters,
  AppUpdater,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { initLoadingIndicator } from './lib/loading_indicator';
import { getSessionStorage } from './lib/storage';
import { SESSIONSTORAGE_LASTPATH } from '../common/lib/constants';
import { featureCatalogueEntry } from './feature_catalogue_entry';
import { ExpressionsSetup, ExpressionsStart } from '../../../../src/plugins/expressions/public';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
import { UiActionsStart } from '../../../../src/plugins/ui_actions/public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { Start as InspectorStart } from '../../../../src/plugins/inspector/public';
import { BfetchPublicSetup } from '../../../../src/plugins/bfetch/public';
// @ts-expect-error untyped local
import { argTypeSpecs } from './expression_types/arg_types';
import { transitions } from './transitions';
import { getPluginApi, CanvasApi } from './plugin_api';
import { CanvasSrcPlugin } from '../canvas_plugin_src/plugin';
export { CoreStart, CoreSetup };

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface CanvasSetupDeps {
  data: DataPublicPluginSetup;
  expressions: ExpressionsSetup;
  home?: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
  bfetch: BfetchPublicSetup;
}

export interface CanvasStartDeps {
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
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
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps> {
  private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  // TODO: Do we want to completely move canvas_plugin_src into it's own plugin?
  private srcPlugin = new CanvasSrcPlugin();

  public setup(core: CoreSetup<CanvasStartDeps>, plugins: CanvasSetupDeps) {
    const { api: canvasApi, registries } = getPluginApi(plugins.expressions);

    this.srcPlugin.setup(core, { canvas: canvasApi });

    // Set the nav link to the last saved url if we have one in storage
    const lastPath = getSessionStorage().get(
      `${SESSIONSTORAGE_LASTPATH}:${core.http.basePath.get()}`
    );
    if (lastPath) {
      this.appUpdater.next(() => ({
        defaultPath: `#${lastPath}`,
      }));
    }

    core.application.register({
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: 'canvas',
      title: 'Canvas',
      euiIconType: 'canvasApp',
      order: 3000,
      updater$: this.appUpdater,
      mount: async (params: AppMountParameters) => {
        // Load application bundle
        const { renderApp, initializeCanvas, teardownCanvas } = await import('./application');

        // Get start services
        const [coreStart, depsStart] = await core.getStartServices();

        const canvasStore = await initializeCanvas(
          core,
          coreStart,
          plugins,
          depsStart,
          registries,
          this.appUpdater
        );

        const unmount = renderApp(coreStart, depsStart, params, canvasStore);

        return () => {
          unmount();
          teardownCanvas(coreStart, depsStart);
        };
      },
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.register(featureCatalogueEntry);
    }

    canvasApi.addArgumentUIs(argTypeSpecs);
    canvasApi.addTransitions(transitions);

    return {
      ...canvasApi,
    };
  }

  public start(core: CoreStart, plugins: CanvasStartDeps) {
    this.srcPlugin.start(core, plugins);
    initLoadingIndicator(core.http.addLoadingCountSource);
  }
}
