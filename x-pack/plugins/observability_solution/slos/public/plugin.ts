/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
} from '@kbn/core/public';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SlosPluginSetupDeps, SlosPluginStartDeps } from './types'; // TODO move later to type
import { PLUGIN_NAME } from '../common';
import type { SlosPluginSetup, SlosPluginStart } from './types';

export class SlosPlugin implements Plugin<SlosPluginSetup, SlosPluginStart> {
  public setup(core: CoreSetup, plugins: SlosPluginSetupDeps) /* : SlosPluginSetup*/ {
    // plugins.observabilityShared.navigation.registerSections(from(core.getStartServices()).pipe(
    //   map(([]) => {
    //     return [
    //       ...(capabilities.slos.show ? [ { label: 'SLOs new'}] : [])
    //     ]
    //   })
    // ));
    // Register an application into the side navigation menu
    core.application.register({
      id: 'slos',
      title: PLUGIN_NAME,
      order: 8001, // 8100 adds it after Cases, 8000 adds it before alerts, 8001 adds it after Alerts
      euiIconType: 'logoObservability',
      appRoute: '/app/slos',
      category: DEFAULT_APP_CATEGORIES.observability,
      // Do I need deep links
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp({
          core: coreStart,
          plugins: depsStart as SlosPluginStartDeps,
          appMountParameters: params,
          ObservabilityPageTemplate: depsStart.observabilityShared.navigation.PageTemplate,
        });
      },
    });
  }

  public start(core: CoreStart, plugins: SlosPluginStartDeps) /* : SlosPluginStart*/ {
    return {};
  }

  public stop() {}
}
