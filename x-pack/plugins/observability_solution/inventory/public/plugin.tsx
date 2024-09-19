/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { from, map } from 'rxjs';
import {
  AppMountParameters,
  APP_WRAPPER_CLASS,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
  AppStatus,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { INVENTORY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { css } from '@emotion/css';
import type {
  ConfigSchema,
  InventoryPublicSetup,
  InventoryPublicStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';
import { InventoryServices } from './services/types';
import { createCallInventoryAPI } from './api';

export class InventoryPlugin
  implements
    Plugin<
      InventoryPublicSetup,
      InventoryPublicStart,
      InventorySetupDependencies,
      InventoryStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InventoryStartDependencies, InventoryPublicStart>,
    pluginsSetup: InventorySetupDependencies
  ): InventoryPublicSetup {
    const inventoryAPIClient = createCallInventoryAPI(coreSetup);
    const isEntityCentricExperienceSettingEnabled = coreSetup.uiSettings.get<boolean>(
      'observability:entityCentricExperience',
      true
    );

    if (isEntityCentricExperienceSettingEnabled) {
      pluginsSetup.observabilityShared.navigation.registerSections(
        from(coreSetup.getStartServices()).pipe(
          map(([coreStart, pluginsStart]) => {
            return [
              {
                label: '',
                sortKey: 101,
                entries: [
                  {
                    label: i18n.translate('xpack.inventory.inventoryLinkTitle', {
                      defaultMessage: 'Inventory',
                    }),
                    app: INVENTORY_APP_ID,
                    path: '/',
                    matchPath(currentPath: string) {
                      return ['/', ''].some((testPath) => currentPath.startsWith(testPath));
                    },
                    isTechnicalPreview: true,
                  },
                ],
              },
            ];
          })
        )
      );
    }

    coreSetup.application.register({
      id: INVENTORY_APP_ID,
      title: i18n.translate('xpack.inventory.appTitle', {
        defaultMessage: 'Inventory',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observability/inventory',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: ['sideNav', 'globalSearch'],
      order: 8004,
      status: isEntityCentricExperienceSettingEnabled
        ? AppStatus.accessible
        : AppStatus.inaccessible,
      deepLinks: [
        {
          id: 'inventory',
          title: i18n.translate('xpack.inventory.inventoryDeepLinkTitle', {
            defaultMessage: 'Inventory',
          }),
          path: '/',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        const services: InventoryServices = {
          inventoryAPIClient,
        };

        ReactDOM.render(
          <Application
            coreStart={coreStart}
            history={appMountParameters.history}
            pluginsStart={pluginsStart}
            theme$={appMountParameters.theme$}
            services={services}
          />,
          appMountParameters.element
        );

        const appWrapperClassName = css`
          overflow: auto;
        `;

        const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];

        appWrapperElement.classList.add(appWrapperClassName);

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
          appWrapperElement.classList.remove(appWrapperClassName);
        };
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: InventoryStartDependencies): InventoryPublicStart {
    return {};
  }
}
