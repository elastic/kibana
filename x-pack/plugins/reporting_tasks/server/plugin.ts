/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { constants } from '../../reporting/common';
import { ReportingSetup as ReportingPlugin } from '../../reporting/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRegisterDefinition,
} from '../../task_manager/server';

type ReportingTasksPluginSetup = void;
type ReportingTasksPluginStart = void;

interface ReportingTasksPluginSetupDeps {
  taskManager: TaskManagerSetupContract;
  reporting?: ReportingPlugin;
}
interface ReportingTasksPluginsStartDeps {
  taskManager: TaskManagerStartContract;
  reporting?: ReportingPlugin;
}

export class ReportingTasksPlugin
  implements
    Plugin<
      ReportingTasksPluginSetup,
      ReportingTasksPluginStart,
      ReportingTasksPluginSetupDeps,
      ReportingTasksPluginsStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }
  setup(_core: CoreSetup, plugins: ReportingTasksPluginSetupDeps) {
    const { reporting, taskManager } = plugins;

    if (reporting) {
      this.logger.debug(`Reporting is enabled.`);
      // Reporting registers the full task types
      return;
    }

    // Register "dummy" task types on behalf of Reporting
    this.logger.info(`Reporting is disabled: registering minimal task types.`);

    const stubTask: TaskRegisterDefinition = {
      createTaskRunner: () => ({
        async run() {},
      }),
      maxConcurrency: 0,
    };

    taskManager.registerTaskDefinitions({
      [constants.REPORTING_EXECUTE_TYPE]: stubTask,
      [constants.REPORTING_MONITOR_TYPE]: stubTask,
    });
  }
  start() {}
}
