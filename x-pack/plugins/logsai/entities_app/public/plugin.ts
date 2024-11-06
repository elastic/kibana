/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { from, map } from 'rxjs';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { ENTITY_APP_ID } from '@kbn/deeplinks-observability/constants';
import type {
  ConfigSchema,
  EntitiesAppPublicSetup,
  EntitiesAppPublicStart,
  EntitiesAppSetupDependencies,
  EntitiesAppStartDependencies,
} from './types';
import { EntitiesAppServices } from './services/types';

export class EntitiesAppPlugin
  implements
    Plugin<
      EntitiesAppPublicSetup,
      EntitiesAppPublicStart,
      EntitiesAppSetupDependencies,
      EntitiesAppStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<EntitiesAppStartDependencies, EntitiesAppPublicStart>,
    pluginsSetup: EntitiesAppSetupDependencies
  ): EntitiesAppPublicSetup {
    pluginsSetup.observabilityShared.navigation.registerSections(
      from(coreSetup.getStartServices()).pipe(
        map(([coreStart, pluginsStart]) => {
          return [
            {
              label: '',
              sortKey: 101,
              entries: [
                {
                  label: i18n.translate('xpack.entities.entitiesAppLinkTitle', {
                    defaultMessage: 'Entities',
                  }),
                  app: ENTITY_APP_ID,
                  path: '/',
                  matchPath(currentPath: string) {
                    return ['/', ''].some((testPath) => currentPath.startsWith(testPath));
                  },
                },
              ],
            },
          ];
        })
      )
    );

    coreSetup.application.register({
      id: ENTITY_APP_ID,
      title: i18n.translate('xpack.entities.appTitle', {
        defaultMessage: 'Entities',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/entities',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: ['sideNav'],
      order: 8001,
      deepLinks: [
        {
          id: 'entities',
          title: i18n.translate('xpack.entities.entitiesAppDeepLinkTitle', {
            defaultMessage: 'Entities',
          }),
          path: '/',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        const services: EntitiesAppServices = {};

        return renderApp({
          coreStart,
          pluginsStart,
          services,
          appMountParameters,
        });
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: EntitiesAppStartDependencies): EntitiesAppPublicStart {
    return {};
  }
}
