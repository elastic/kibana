/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import type { Tier } from '../../types';
import { ProductTier } from '../../../common/product';
import { NLP_CLEANUP_TASK_EVENT } from '../../telemetry/event_based_telemetry';

export const NLPCleanupTaskConstants = {
  TITLE: 'Serverless NLP Cleanup Task',
  TYPE: 'serverless-security:nlp-cleanup-task',
  VERSION: '1.0.0',
  INTERVAL: '6h',
  SCOPE: ['serverlessSecurity'],
  TIMEOUT: '20m',
};

export interface NLPCleanupTaskSetupContract {
  core: CoreSetup;
  logFactory: LoggerFactory;
  taskManager: TaskManagerSetupContract;
  productTier: Tier;
}

export interface NLPCleanupTaskStartContract {
  taskManager: TaskManagerStartContract;
}

/**
 * This task is responsible for periodically cleaning up all NLP model deployments, specifically, trained models where
 * the `model_type` is `pytorch`.
 *
 * NLP is only intended to be enabled for the Security `complete` productTier, however due to current capabilities
 * (see: https://github.com/elastic/ml-team/issues/1139), it will remain enabled at the ES level for all productTiers,
 * so we must periodically check for any NLP models that may have been manually deployed via the ES API and clean them
 * up.
 *
 * Note: Models cannot be deployed via the Kibana UI as NLP will be disabled on the Kibana side by project-controller
 * based on the productTier, so no additional UI gating is necessary.
 *
 * See https://github.com/elastic/security-team/issues/7995 for further details.
 *
 * Task Details: after discussion with ResponseOps, it is preferred for the task to always be registered regardless of
 * the productTier, and to only schedule it if the productTier is `complete`.
 *
 * See `x-pack/test/security_solution_api_integration/test_suites/genai/nlp_cleanup_task` for API integration tests.
 */
export class NLPCleanupTask {
  private logger: Logger;
  private readonly productTier: Tier;
  private wasStarted: boolean = false;

  constructor(setupContract: NLPCleanupTaskSetupContract) {
    const { core, logFactory, productTier, taskManager } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.productTier = productTier;

    this.logger.info(
      `Registering ${NLPCleanupTaskConstants.TYPE} task with timeout of [${NLPCleanupTaskConstants.TIMEOUT}], and interval of [${NLPCleanupTaskConstants.INTERVAL}]`
    );

    try {
      taskManager.registerTaskDefinitions({
        [NLPCleanupTaskConstants.TYPE]: {
          title: NLPCleanupTaskConstants.TITLE,
          timeout: NLPCleanupTaskConstants.TIMEOUT,
          createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
            return {
              run: async () => {
                if (this.productTier === ProductTier.complete) {
                  throwUnrecoverableError(
                    new Error('Task no longer needed for current productTier, disabling...')
                  );
                }
                return this.runTask(taskInstance, core);
              },
              cancel: async () => {
                this.logger.warn(`${NLPCleanupTaskConstants.TYPE} task was cancelled`);
              },
            };
          },
        },
      });
      this.logger.info(`Registered ${NLPCleanupTaskConstants.TYPE} task successfully!`);
    } catch (err) {
      this.logger.error(`Failed to register ${NLPCleanupTaskConstants.TYPE} task, ${err}`);
    }
  }

  public start = async ({ taskManager }: NLPCleanupTaskStartContract) => {
    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: NLPCleanupTaskConstants.TYPE,
        scope: NLPCleanupTaskConstants.SCOPE,
        schedule: {
          interval: NLPCleanupTaskConstants.INTERVAL,
        },
        state: {},
        params: { version: NLPCleanupTaskConstants.VERSION },
      });

      if (this.productTier !== ProductTier.complete) {
        // In case the task was previously ran and is scheduled for later in the future, run now
        this.logger.info('Scheduling for immediate run');
        await taskManager.runSoon(this.taskId);
      }
    } catch (e) {
      this.logger.error(
        `Error scheduling task ${NLPCleanupTaskConstants.TYPE}, received ${e.message}`
      );
    }
  };

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      // old task, return
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;
    let totalInstalled = 0;
    let failedDeletes = 0;

    try {
      const trainedModels = await esClient.ml.getTrainedModels();
      const pytorchModels = trainedModels.trained_model_configs.filter(
        (config) => config.model_type === 'pytorch'
      );
      totalInstalled = pytorchModels.length;

      if (totalInstalled === 0) {
        this.logger.info('No pytorch models found, exiting task');
        return { state: {} };
      }

      this.logger.info(
        `[${totalInstalled}] pytorch model(s) found. Stopping, then deleting models/aliases`
      );

      // First attempt to stop all models, use force=true to ensure any linked pipelines don't get in the way
      const stopResponses = await Promise.all(
        pytorchModels.map((m) =>
          esClient.ml.stopTrainedModelDeployment({ model_id: m.model_id, force: true })
        )
      );
      const successfulStops = stopResponses.filter((r) => r.stopped).length;
      const failedStops = stopResponses.length - successfulStops;
      this.logger.info(
        `[${successfulStops}] model(s) successfully stopped, [${failedStops}] model(s) failed to stop`
      );

      // Then delete all models, use force=true again to ensure any linked pipelines don't get in the way
      const deleteResponses = await Promise.all(
        pytorchModels.map((m) =>
          esClient.ml.deleteTrainedModel({ model_id: m.model_id, force: true })
        )
      );
      const successfulDeletes = deleteResponses.filter((r) => r.acknowledged).length;
      failedDeletes = deleteResponses.length - successfulDeletes;
      const outputMessage = `[${successfulDeletes}] model(s) successfully deleted, [${failedDeletes}] model(s) failed to delete`;
      this.logger.info(outputMessage);

      core.analytics.reportEvent(NLP_CLEANUP_TASK_EVENT.eventType, {
        failedToDeleteCount: failedDeletes,
        message: outputMessage,
        productTier: this.productTier,
        totalInstalledCount: totalInstalled,
      });

      // TODO: Any manual cleanup around aliases? They appear to be deleted with the model...
    } catch (err) {
      core.analytics.reportEvent(NLP_CLEANUP_TASK_EVENT.eventType, {
        failedToDeleteCount: failedDeletes,
        message: err.message,
        productTier: this.productTier,
        totalInstalledCount: totalInstalled,
      });
      this.logger.error(`Failed to fetch and cleanup models: ${err}`);
      return;
    }

    this.logger.info(`Task completed successfully!`);

    const state = {};
    return { state };
  };

  private get taskId() {
    return `${NLPCleanupTaskConstants.TYPE}:${NLPCleanupTaskConstants.VERSION}`;
  }
}
