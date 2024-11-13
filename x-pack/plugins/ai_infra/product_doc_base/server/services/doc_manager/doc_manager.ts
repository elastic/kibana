/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { type TaskManagerStartContract, TaskStatus } from '@kbn/task-manager-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { InstallationStatus } from '../../../common/install_status';
import type { ProductDocInstallClient } from '../doc_install_status';
import {
  INSTALL_ALL_TASK_ID,
  scheduleInstallAllTask,
  scheduleUninstallAllTask,
  scheduleEnsureUpToDateTask,
  getTaskStatus,
  waitUntilTaskCompleted,
} from '../../tasks';
import { checkLicense } from './check_license';
import type {
  DocumentationManagerAPI,
  DocGetStatusResponse,
  DocInstallOptions,
  DocUninstallOptions,
  DocUpdateOptions,
} from './types';

const TEN_MIN_IN_MS = 10 * 60 * 1000;

/**
 * High-level installation service, handling product documentation
 * installation as unary operations, abstracting away the fact
 * that documentation is composed of multiple entities.
 */
export class DocumentationManager implements DocumentationManagerAPI {
  private logger: Logger;
  private taskManager: TaskManagerStartContract;
  private licensing: LicensingPluginStart;
  private docInstallClient: ProductDocInstallClient;

  constructor({
    logger,
    taskManager,
    licensing,
    docInstallClient,
  }: {
    logger: Logger;
    taskManager: TaskManagerStartContract;
    licensing: LicensingPluginStart;
    docInstallClient: ProductDocInstallClient;
  }) {
    this.logger = logger;
    this.taskManager = taskManager;
    this.licensing = licensing;
    this.docInstallClient = docInstallClient;
  }

  async install(options: DocInstallOptions = {}): Promise<void> {
    const { force = false, wait = false } = options;

    const { status } = await this.getStatus();
    if (!force && status === 'installed') {
      return;
    }

    const license = await this.licensing.getLicense();
    if (!checkLicense(license)) {
      throw new Error('Elastic documentation requires an enterprise license');
    }

    const taskId = await scheduleInstallAllTask({
      taskManager: this.taskManager,
      logger: this.logger,
    });

    if (wait) {
      await waitUntilTaskCompleted({
        taskManager: this.taskManager,
        taskId,
        timeout: TEN_MIN_IN_MS,
      });
    }
  }

  async update(options: DocUpdateOptions = {}): Promise<void> {
    const { wait = false } = options;

    const taskId = await scheduleEnsureUpToDateTask({
      taskManager: this.taskManager,
      logger: this.logger,
    });

    if (wait) {
      await waitUntilTaskCompleted({
        taskManager: this.taskManager,
        taskId,
        timeout: TEN_MIN_IN_MS,
      });
    }
  }

  async uninstall(options: DocUninstallOptions = {}): Promise<void> {
    const { wait = false } = options;

    const taskId = await scheduleUninstallAllTask({
      taskManager: this.taskManager,
      logger: this.logger,
    });

    if (wait) {
      await waitUntilTaskCompleted({
        taskManager: this.taskManager,
        taskId,
        timeout: TEN_MIN_IN_MS,
      });
    }
  }

  async getStatus(): Promise<DocGetStatusResponse> {
    const taskStatus = await getTaskStatus({
      taskManager: this.taskManager,
      taskId: INSTALL_ALL_TASK_ID,
    });
    if (taskStatus !== 'not_scheduled') {
      const status = convertTaskStatus(taskStatus);
      if (status !== 'unknown') {
        return { status };
      }
    }

    const installStatus = await this.docInstallClient.getInstallationStatus();
    const overallStatus = getOverallStatus(Object.values(installStatus).map((v) => v.status));
    return { status: overallStatus };
  }
}

const convertTaskStatus = (taskStatus: TaskStatus): InstallationStatus | 'unknown' => {
  switch (taskStatus) {
    case TaskStatus.Idle:
    case TaskStatus.Claiming:
    case TaskStatus.Running:
      return 'installing';
    case TaskStatus.Failed:
      return 'error';
    case TaskStatus.Unrecognized:
    case TaskStatus.DeadLetter:
    case TaskStatus.ShouldDelete:
      return 'unknown';
  }
};

const getOverallStatus = (statuses: InstallationStatus[]): InstallationStatus => {
  const statusOrder: InstallationStatus[] = ['error', 'installing', 'uninstalled', 'installed'];
  for (const status of statusOrder) {
    if (statuses.includes(status)) {
      return status;
    }
  }
  return 'installed';
};
