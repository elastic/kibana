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
import { i18n } from '@kbn/i18n';
import { from, map } from 'rxjs';
import type { NavigationSection } from '@kbn/observability-plugin/public';
import { getServices } from './services';
import type { ProfilingPluginPublicSetupDeps } from './types';

export class ProfilingPlugin implements Plugin {
  public setup(core: CoreSetup, deps: ProfilingPluginPublicSetupDeps) {
    // Register an application into the side navigation menu

    const links = [
      {
        id: 'flamegraphs',
        title: i18n.translate('xpack.profiling.navigation.flamegraphLinkLabel', {
          defaultMessage: 'Flamegraphs',
        }),
        path: '/',
      },
    ];

    const section$ = from(core.getStartServices()).pipe(
      map(([coreStart, pluginsStart]) => {
        const sections: NavigationSection[] = [
          {
            label: i18n.translate('xpack.profiling.navigation.sectionLabel', {
              defaultMessage: 'Profiling',
            }),
            entries: links.map((link) => {
              return {
                app: 'profiling',
                label: link.title,
                path: link.path,
              };
            }),
            sortKey: 700,
          },
        ];
        return sections;
      })
    );

    deps.observability.navigation.registerSections(section$);

    core.application.register({
      id: 'profiling',
      title: 'Profiling',
      euiIconType: 'logoObservability',
      appRoute: '/app/profiling',
      category: DEFAULT_APP_CATEGORIES.observability,
      deepLinks: links,
      async mount({ element }: AppMountParameters) {
        const [coreStart] = await core.getStartServices();

        const startServices = getServices(coreStart);
        const { renderApp } = await import('./app');
        return renderApp(startServices, element);
      },
    });
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
