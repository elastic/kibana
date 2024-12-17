/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart, SavedObjectsClient } from '@kbn/core/server';

import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskInstance,
} from '@kbn/task-manager-plugin/server';

import type {
  SearchConnectorsPluginStartDependencies,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
} from './types';
import {
  AgentlessConnectorsInfraService,
  getConnectorsWithoutPolicies,
  getPoliciesWithoutConnectors,
} from './services';

import { SearchConnectorsConfig } from './config';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */

const AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID = 'search:agentless-connectors-sync-task';
const AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE = 'search:agentless-connectors-sync';

const SCHEDULE = { interval: '10s' };

export class AgentlessConnectorDeploymentsSyncService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }
  public registerInfraSyncTask(
    config: SearchConnectorsConfig,
    plugins: SearchConnectorsPluginSetupDependencies,
    coreStartServicesPromise: Promise<
      [CoreStart, SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart]
    >
  ) {
    const taskManager = plugins.taskManager;

    taskManager.registerTaskDefinitions({
      [AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE]: {
        title: 'Agentless Connector Deployment Check and Sync',
        description:
          'This task peridocally checks native connectors, agent policies and syncs them if they are out of sync',
        timeout: '1m',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              // TODO: not run if no license

              this.logger.debug('Checking state of connectors and agentless policies');
              const startServices = await coreStartServicesPromise;

              const esClient = startServices[0].elasticsearch.client.asInternalUser;
              const savedObjects = startServices[0].savedObjects;

              const agentPolicyService = startServices[1].fleet.agentPolicyService;
              const packagePolicyService = startServices[1].fleet.packagePolicyService;

              const soClient = new SavedObjectsClient(savedObjects.createInternalRepository());

              const service = new AgentlessConnectorsInfraService(
                soClient,
                esClient,
                packagePolicyService,
                agentPolicyService,
                this.logger
              );

              // Fetch connectors
              const nativeConnectors = await service.getNativeConnectors();

              const policiesMetadata = await service.getConnectorPackagePolicies();

              const connectorsWithoutPolicies = getConnectorsWithoutPolicies(
                policiesMetadata,
                nativeConnectors
              );

              // Check license if any native connectors or agentless policies found
              if (nativeConnectors.length > 0 || policiesMetadata.length > 0) {
                const license = await startServices[1].licensing.getLicense();

                if (license.check('fleet', 'platinum').state !== 'valid') {
                  this.logger.warn(
                    'Current license is not compatible with agentless connectors. Please upgrade the license to at least platinum'
                  );
                  return;
                }
              }

              let agentlessConnectorsDeployed = 0;
              for (const connectorMetadata of connectorsWithoutPolicies) {
                await service.deployConnector(connectorMetadata);

                agentlessConnectorsDeployed += 1;
              }

              const policiesWithoutConnectors = getPoliciesWithoutConnectors(
                policiesMetadata,
                nativeConnectors
              );
              let agentlessConnectorsRemoved = 0;

              for (const policyMetadata of policiesWithoutConnectors) {
                await service.removeDeployment(policyMetadata);

                agentlessConnectorsRemoved += 1;
              }

              try {
                return {
                  state: {},
                  schedule: SCHEDULE,
                };
              } catch (e) {
                this.logger.warn(`Error executing agentless deployment sync task: ${e.message}`);
                return {
                  state: {},
                  schedule: SCHEDULE,
                };
              }
            },
            cancel: async () => {
              this.logger.warn('timed out');
            },
          };
        },
      },
    });
  }

  public async scheduleInfraSyncTask(
    config: SearchConnectorsConfig,
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    this.logger.info(`Scheduling ${AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID}`);
    try {
      await taskManager.removeIfExists(AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID);
      const taskInstance = await taskManager.ensureScheduled({
        id: AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID,
        taskType: AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE,
        schedule: SCHEDULE,
        params: {},
        state: {},
        scope: ['search', 'connectors'],
      });

      this.logger.info(
        `Scheduled ${AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID} with interval ${taskInstance.schedule?.interval}`
      );

      return taskInstance;
    } catch (e) {
      this.logger.error(
        `Error scheduling ${AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID}, received ${e.message}`
      );
      return null;
    }
  }
}
