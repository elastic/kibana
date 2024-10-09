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
  PluginInitializerContext,
  AppStatus,
} from '@kbn/core/public';
import { INVENTORY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { from, map } from 'rxjs';
import { createCallInventoryAPI } from './api';
import { TelemetryService } from './services/telemetry/telemetry_service';
import { InventoryServices } from './services/types';
import type {
  ConfigSchema,
  InventoryPublicSetup,
  InventoryPublicStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';

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
  telemetry: TelemetryService;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.telemetry = new TelemetryService();
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
                sortKey: 300,
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
    this.telemetry.setup({ analytics: coreSetup.analytics });
    const telemetry = this.telemetry.start();

    coreSetup.application.register({
      id: INVENTORY_APP_ID,
      title: i18n.translate('xpack.inventory.appTitle', {
        defaultMessage: 'Inventory',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observability/inventory',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: ['sideNav', 'globalSearch'],
      order: 8200,
      status: isEntityCentricExperienceSettingEnabled
        ? AppStatus.accessible
        : AppStatus.inaccessible,
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        const services: InventoryServices = {
          inventoryAPIClient,
          telemetry,
        };

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

  start(coreStart: CoreStart, pluginsStart: InventoryStartDependencies): InventoryPublicStart {
    return {};
  }
}
