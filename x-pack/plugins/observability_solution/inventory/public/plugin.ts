/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  AppStatus,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { INVENTORY_APP_ID } from '@kbn/deeplinks-observability/constants';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { from, map, mergeMap, of } from 'rxjs';
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
  kibanaVersion: string;
  isServerlessEnv: boolean;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.telemetry = new TelemetryService();
    this.kibanaVersion = context.env.packageInfo.version;
    this.isServerlessEnv = context.env.packageInfo.buildFlavor === 'serverless';
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

    this.telemetry.setup({
      analytics: coreSetup.analytics,
    });

    const telemetry = this.telemetry.start();

    const getStartServices = coreSetup.getStartServices();

    const hideInventory$ = from(getStartServices).pipe(
      mergeMap(([coreStart, pluginsStart]) => {
        if (pluginsStart.spaces) {
          return from(pluginsStart.spaces.getActiveSpace()).pipe(
            map(
              (space) =>
                space.disabledFeatures.includes(INVENTORY_APP_ID) ||
                !coreStart.application.capabilities.inventory.show
            )
          );
        }

        return of(!coreStart.application.capabilities.inventory.show);
      })
    );

    const sections$ = hideInventory$.pipe(
      map((hideInventory) => {
        if (isEntityCentricExperienceSettingEnabled && !hideInventory) {
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
        }
        return [];
      })
    );

    pluginsSetup.observabilityShared.navigation.registerSections(sections$);

    const isCloudEnv = !!pluginsSetup.cloud?.isCloudEnabled;
    const isServerlessEnv = pluginsSetup.cloud?.isServerlessEnabled || this.isServerlessEnv;

    coreSetup.application.register({
      id: INVENTORY_APP_ID,
      title: i18n.translate('xpack.inventory.appTitle', {
        defaultMessage: 'Inventory',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/inventory',
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
          getStartServices,
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
          kibanaEnvironment: {
            isCloudEnv,
            isServerlessEnv,
            kibanaVersion: this.kibanaVersion,
          },
        });
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: InventoryStartDependencies): InventoryPublicStart {
    return {};
  }
}
