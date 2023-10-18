/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { AlertingPluginsStart } from '../plugin';

interface ConstructorOpts {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
}

export class AdHocRuleRunClient {
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private readonly checkerTaskType = 'Ad-Hoc-Rule-Run-Check';
  private readonly adHocRuleRunTaskType = 'Ad-Hoc-Rule-Run';
  private readonly checkerTaskTimeout = '1m';
  private readonly checkerTaskInterval = '1m';

  constructor(opts: ConstructorOpts) {
    this.logger = opts.logger;

    // Register the task that checks if there are any ad hoc rule
    // runs in the queue and schedules the run if there are
    opts.taskManager.registerTaskDefinitions({
      [this.checkerTaskType]: {
        title: 'Alerting Ad Hoc Rule Run Check',
        timeout: this.checkerTaskTimeout,
        createTaskRunner: () => {
          return {
            run: async () => this.runCheckTask(opts.coreStartServices),
          };
        },
      },
    });

    // Registers the task that handles the ad hoc rule run
    opts.taskManager.registerTaskDefinitions({
      [this.adHocRuleRunTaskType]: {
        title: 'Alerting Ad Hoc Rule Run',
        createTaskRunner: () => {
          return {
            run: async () => {},
          };
        },
      },
    });
  }

  public async startCheck(taskManager: TaskManagerStartContract) {
    this.taskManager = taskManager;

    try {
      await taskManager.ensureScheduled({
        id: this.checkerTaskType,
        taskType: this.checkerTaskType,
        schedule: {
          interval: this.checkerTaskInterval,
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger.error(`Error scheduling ${this.checkerTaskType}, received ${e.message}`);
    }
  }

  private runCheckTask = async (
    coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
  ) => {
    this.logger.info(`Running ad hoc rule run check task`);
    try {
      // Ensure no ad hoc task is currently running
      try {
        this.logger.info(`Trying to get task with ID ${this.adHocRuleRunTaskType}`);
        await this.taskManager?.get(this.adHocRuleRunTaskType);
        // found an ad hoc rule run task, don't schedule another one
        return;
      } catch (err) {
        this.logger.info(`No current ad hoc rule run task found - proceeding`);
        // no ad hoc rule run task found, proceed
      }

      // Check if there are any ad hoc rule runs queued up
      const [coreStart] = await coreStartServices;
      const savedObjectsRepository = coreStart.savedObjects.createInternalRepository([
        'ad_hoc_rule_run_params',
      ]);
      const findResponse = await savedObjectsRepository.find({
        type: 'ad_hoc_rule_run_params',
        sortField: 'createdAt',
        perPage: 1,
      });
      this.logger.info(
        `Find result for ad_hoc_rule_run_params SO: ${JSON.stringify(findResponse)}`
      );

      if (findResponse.total > 0) {
        const adHocRun = findResponse.saved_objects[0];

        this.logger.info(
          `Scheduling task ${JSON.stringify({
            id: this.adHocRuleRunTaskType,
            taskType: this.adHocRuleRunTaskType,
            state: {},
            params: {
              adHocRuleRunParamsId: adHocRun.id,
            },
          })}`
        );
        // Schedule the ad hoc rule run
        await this.taskManager?.schedule({
          id: this.adHocRuleRunTaskType,
          taskType: this.adHocRuleRunTaskType,
          state: {},
          params: {
            adHocRuleRunParamsId: adHocRun.id,
          },
        });
      } else {
        this.logger.info(`No ad hoc rule runs queued`);
      }
    } catch (error) {
      this.logger.warn(`Error running ad hoc rule run check task: ${error}`);
    }
  };
}
