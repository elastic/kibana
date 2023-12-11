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
import type { NavigationSection } from '@kbn/observability-shared-plugin/public';
import type { Location } from 'history';
import { BehaviorSubject, combineLatest, from, map } from 'rxjs';
import { registerEmbeddables } from './embeddables/register_embeddables';
import { getServices } from './services';
import type { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from './types';
import { ProfilingEmbeddablesDependencies } from './embeddables/profiling_embeddable_provider';

export type ProfilingPluginSetup = void;
export type ProfilingPluginStart = void;

export class ProfilingPlugin implements Plugin {
  public setup(coreSetup: CoreSetup, pluginsSetup: ProfilingPluginPublicSetupDeps) {
    // Register an application into the side navigation menu
    const links = [
      {
        id: 'stacktraces',
        title: i18n.translate('xpack.profiling.navigation.stacktracesLinkLabel', {
          defaultMessage: 'Stacktraces',
        }),
        path: '/stacktraces',
      },
      {
        id: 'flamegraphs',
        title: i18n.translate('xpack.profiling.navigation.flameGraphsLinkLabel', {
          defaultMessage: 'Flamegraphs',
        }),
        path: '/flamegraphs',
      },
      {
        id: 'functions',
        title: i18n.translate('xpack.profiling.navigation.functionsLinkLabel', {
          defaultMessage: 'Functions',
        }),
        path: '/functions',
      },
    ];

    const kuerySubject = new BehaviorSubject<string>('');

    const section$ = combineLatest([from(coreSetup.getStartServices()), kuerySubject]).pipe(
      map(([[coreStart], kuery]) => {
        if (coreStart.application.capabilities.profiling.show) {
          const sections: NavigationSection[] = [
            {
              label: i18n.translate('xpack.profiling.navigation.sectionLabel', {
                defaultMessage: 'Universal Profiling',
              }),
              entries: links.map((link) => {
                return {
                  app: 'profiling',
                  label: link.title,
                  path: `${link.path}?kuery=${kuery ?? ''}`,
                  matchPath: (path) => {
                    return path.startsWith(link.path);
                  },
                };
              }),
              sortKey: 700,
            },
          ];
          return sections;
        }
        return [];
      })
    );

    pluginsSetup.observabilityShared.navigation.registerSections(section$);

    const profilingFetchServices = getServices();

    coreSetup.application.register({
      id: 'profiling',
      title: 'Universal Profiling',
      euiIconType: 'logoObservability',
      appRoute: '/app/profiling',
      category: DEFAULT_APP_CATEGORIES.observability,
      deepLinks: links,
      async mount({ element, history, theme$, setHeaderActionMenu }: AppMountParameters) {
        const [coreStart, pluginsStart] = (await coreSetup.getStartServices()) as [
          CoreStart,
          ProfilingPluginPublicStartDeps,
          unknown
        ];

        const { renderApp } = await import('./app');

        function pushKueryToSubject(location: Location) {
          const query = new URLSearchParams(location.search);
          kuerySubject.next(query.get('kuery') ?? '');
        }

        pushKueryToSubject(history.location);

        history.listen(pushKueryToSubject);

        const unmount = renderApp(
          {
            profilingFetchServices,
            coreStart,
            coreSetup,
            pluginsStart,
            pluginsSetup,
            history,
            theme$,
            setHeaderActionMenu,
          },
          element
        );

        return () => {
          unmount();
          kuerySubject.next('');
        };
      },
    });

    const getProfilingEmbeddableDependencies =
      async (): Promise<ProfilingEmbeddablesDependencies> => {
        const [coreStart, pluginsStart] = (await coreSetup.getStartServices()) as [
          CoreStart,
          ProfilingPluginPublicStartDeps,
          unknown
        ];
        return {
          coreStart,
          coreSetup,
          pluginsStart,
          pluginsSetup,
          profilingFetchServices,
        };
      };

    registerEmbeddables(pluginsSetup.embeddable, getProfilingEmbeddableDependencies);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
