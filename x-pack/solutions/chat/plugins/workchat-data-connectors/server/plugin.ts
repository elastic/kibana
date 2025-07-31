/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type {
  WorkchatDataConnectorsPluginSetup,
  WorkchatDataConnectorsPluginStart,
  WorkchatDataConnectorsPluginSetupDependencies,
  WorkchatDataConnectorsPluginStartDependencies,
} from './types';
import { defineRoutes } from './routes';
import { getConnectorDataSources } from './connectors';

export class WorkchatDataConnectorsPlugin
  implements
    Plugin<
      WorkchatDataConnectorsPluginSetup,
      WorkchatDataConnectorsPluginStart,
      WorkchatDataConnectorsPluginSetupDependencies,
      WorkchatDataConnectorsPluginStartDependencies
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.logger.info('WorkchatDataConnectorsPlugin: Constructor called');
  }

  public setup(
    core: CoreSetup<WorkchatDataConnectorsPluginStartDependencies>,
    { workchatApp }: WorkchatDataConnectorsPluginSetupDependencies
  ): WorkchatDataConnectorsPluginSetup {
    this.logger.info('WorkchatDataConnectorsPlugin: Setup phase started');

    try {
      // Check if workchatApp dependency is available
      if (!workchatApp) {
        this.logger.error('WorkchatDataConnectorsPlugin: workchatApp dependency is not available');
        return {};
      }

      if (!workchatApp.dataSourcesRegistry) {
        this.logger.error(
          'WorkchatDataConnectorsPlugin: dataSourcesRegistry is not available on workchatApp'
        );
        return {};
      }

      this.logger.info(
        'WorkchatDataConnectorsPlugin: workchatApp and dataSourcesRegistry are available'
      );

      // Get connector data sources
      const connectorDataSources = getConnectorDataSources();
      this.logger.info(
        `WorkchatDataConnectorsPlugin: Got ${connectorDataSources.length} connector data sources to register`
      );

      // Register all connector data sources
      connectorDataSources.forEach((dataSource, index) => {
        this.logger.info(
          `WorkchatDataConnectorsPlugin: Registering connector ${index + 1}/${
            connectorDataSources.length
          }: ${dataSource.name} (type: ${dataSource.type})`
        );

        try {
          workchatApp.dataSourcesRegistry.register(dataSource);
          this.logger.info(
            `WorkchatDataConnectorsPlugin: Successfully registered ${dataSource.name}`
          );
        } catch (error) {
          this.logger.error(
            `WorkchatDataConnectorsPlugin: Failed to register ${dataSource.name}:`,
            error
          );
        }
      });

      this.logger.info(
        'WorkchatDataConnectorsPlugin: Finished registering all connector data sources'
      );

      const router = core.http.createRouter();

      // Register server side APIs
      defineRoutes(router);

      this.logger.info('WorkchatDataConnectorsPlugin: Setup completed successfully');
      return {};
    } catch (error) {
      this.logger.error('WorkchatDataConnectorsPlugin: Error during setup:', error);
      return {};
    }
  }

  public start(
    core: CoreStart,
    deps: WorkchatDataConnectorsPluginStartDependencies
  ): WorkchatDataConnectorsPluginStart {
    this.logger.info('WorkchatDataConnectorsPlugin: Start phase');
    return {};
  }

  public stop() {
    this.logger.info('WorkchatDataConnectorsPlugin: Stop phase');
  }
}
