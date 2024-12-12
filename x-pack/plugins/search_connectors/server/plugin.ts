/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  Plugin,
  CoreStart,
  CoreSetup,
  Logger,
} from '@kbn/core/server';
import { ConnectorServerSideDefinition } from '@kbn/search-connectors';
import { getConnectorTypes } from '../common/lib/connector_types';
import type {
  SearchConnectorsPluginSetup as SearchConnectorsPluginSetup,
  SearchConnectorsPluginStart as SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
  SearchConnectorsPluginStartDependencies,
} from './types';

import { AgentlessConnectorDeploymentsSyncService } from './task';

export class SearchConnectorsPlugin
  implements
    Plugin<
      SearchConnectorsPluginSetup,
      SearchConnectorsPluginStart,
      SearchConnectorsPluginSetupDependencies,
      SearchConnectorsPluginStartDependencies
    >
{
  private connectors: ConnectorServerSideDefinition[];
  private log: Logger;
  private agentlessConnectorDeploymentsSyncService: AgentlessConnectorDeploymentsSyncService;

  constructor(initializerContext: PluginInitializerContext) {
    this.connectors = [];
    this.log = initializerContext.logger.get();
    this.agentlessConnectorDeploymentsSyncService = new AgentlessConnectorDeploymentsSyncService(
      this.log
    );
  }

  public setup(
    coreSetup: CoreSetup<SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart>,
    plugins: SearchConnectorsPluginSetupDependencies
  ) {
    const http = coreSetup.http;

    this.connectors = getConnectorTypes(http.staticAssets);

    this.log.info('HEHE REGISTERING SYNC TASK');

    const coreStartServices = coreSetup.getStartServices();

    // const coreStartServices = coreSetup.getStartServices().then(services => {
    //   this.agentlessConnectorDeploymentsSyncService.registerSyncTask
    // });

    this.agentlessConnectorDeploymentsSyncService.registerSyncTask(plugins, coreStartServices);

    return {
      getConnectorTypes: () => this.connectors,
    };
  }

  public start(coreStart: CoreStart, plugins: SearchConnectorsPluginStartDependencies) {
    this.log.info('HEHE STARTING PLUGIN');
    this.agentlessConnectorDeploymentsSyncService
      .scheduleSyncTask(plugins.taskManager)
      .catch((err) => {
        this.log.debug(`Error scheduling saved objects sync task`, err);
      });
    return {
      getConnectors: () => this.connectors,
    };
  }

  public stop() {}
}
