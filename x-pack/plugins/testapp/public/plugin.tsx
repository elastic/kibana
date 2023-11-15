/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters, AppNavLinkStatus } from '@kbn/core/public';
import { UiActionsService } from '@kbn/ui-actions-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

interface StartDeps {
  uiActions: UiActionsService;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

export class EmbeddableExplorerPlugin implements Plugin<void, void, {}, StartDeps> {
  public setup(core: CoreSetup<StartDeps>) {
    core.application.register({
      id: 'testapp',
      title: 'lens confg builder testapp',
      navLinkStatus: AppNavLinkStatus.visible,
      async mount(params: AppMountParameters) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./app');

        return renderApp(
          {
            notifications: coreStart.notifications,
            inspector: depsStart.inspector,
            embeddableApi: depsStart.embeddable,
            lensApi: depsStart.lens,
            dataViews: depsStart.dataViews,
            basename: params.appBasePath,
            uiSettingsClient: coreStart.uiSettings,
            overlays: coreStart.overlays,
            navigateToApp: coreStart.application.navigateToApp,
          },
          params.element
        );
      },
    });
  }

  public start() {}
  public stop() {}
}
