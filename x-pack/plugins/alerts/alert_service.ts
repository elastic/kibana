/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RunContext } from '../task_manager/task';
import { TaskManager } from '../task_manager/task_manager';

interface AlertTemplate {
  id: string;

  description?: string;

  runnable: (context: any) => void;
}

export class AlertService {
  private templatesMap = new Map<string, AlertTemplate>();
  private kbnServer: any;
  private taskManager: TaskManager;

  constructor(kbnServer: any) {
    this.kbnServer = kbnServer;

    const server = this.kbnServer.server;
    server.route({
      method: 'GET',
      path: '/api/alerts',
      handler: (_: any) => {
        return 'Hello World!';
      },
    });
    this.taskManager = server.taskManager;
    this.kbnServer.afterPluginsInit(this.initAfterPlugins.bind(this));
  }

  public getTemplates(): string[] {
    return Object.keys(this.templatesMap);
  }

  public registerAlertTemplate(template: AlertTemplate) {
    if (!this.templatesMap.has(template.id)) {
      this.templatesMap.set(template.id, template);
      this.taskManager.registerTaskDefinitions({
        // clusterMonitoring is the task type, and must be unique across the entire system
        [template.id]: {
          type: template.id,
          title: template.id,
          description: template.description,
          timeOut: '5m',
          numWorkers: 2,

          // The createTaskRunner function / method returns an object that is responsible for
          // performing the work of the task. context: { taskInstance, kbnServer }, is documented below.
          createTaskRunner(context: RunContext) {
            return {
              async run() {
                return new Promise((resolve, reject) => {
                  try {
                    template.runnable({
                      state: context.taskInstance.state,
                    });
                    resolve();
                  } catch (e) {
                    reject({
                      alert: template,
                      exception: e,
                    });
                  }
                });
              },

              // Optional, will be called if a running instance of this task times out, allowing the task
              // to attempt to clean itself up.
              async cancel() {
                // Do whatever is required to cancel this task, such as killing any spawned processes
              },
            };
          },
        },
      });
    } else {
      throw new Error('Condition name already taken');
    }
  }

  public async registerAlert(templateId: string, params: any): Promise<string> {
    const task = await this.taskManager.schedule({
      id: templateId,
      taskType: 'alert',
      scope: templateId,
      params,
    });
    return task.id;
  }

  public async start() {
    return {
      registerAlertTemplate: this.registerAlertTemplate,
    };
  }

  public info(message: string) {
    this.kbnServer.server.log(['info', 'alert-service'], message);
  }

  private async initAfterPlugins() {
    const tasks = await this.taskManager.fetch({
      query: {
        match: {
          type: 'my-fanci-app',
        },
      },
    });

    if (tasks !== undefined) {
      this.info(`We got ${tasks.docs.length} tasks from task manager.`);
      tasks.docs.map((task: any) => {
        this.info(`Destroying task ${task.id}`);
        this.taskManager.remove(task.id);
        return {};
      });
    }
  }
}
