/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { RunContext } from '../task_manager/task';
import { TaskManager } from '../task_manager/task_manager';

interface CheckResult {
  notify?: boolean;
  history?: boolean;
  state?: object;
}

// we are resorting to this method of validation because we refuse to encapsulate
// thinking that it is an abstraction. Which it is not!
const CheckResultType = Joi.object({
  notify: Joi.boolean().optional(),
  history: Joi.boolean().optional(),
  state: Joi.boolean().optional(),
});

interface TemplateCheckContext {
  state?: any;
  params?: any;
}

interface TemplateNotifyContext {
  state?: any;
  params?: any;
  checkResults?: CheckResult;
}

interface AlertTemplate {
  id: string;

  description?: string;

  check: (context: TemplateCheckContext) => CheckResult;

  notify: (context: TemplateNotifyContext) => void;
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
      handler: async () => {
        return await this.getAlerts();
      },
    });
    this.taskManager = server.taskManager;
    this.kbnServer.afterPluginsInit(this.initAfterPlugins.bind(this));
  }

  public getTemplates(): string[] {
    return Object.keys(this.templatesMap);
  }

  public async getAlerts() {
    const { docs } = await this.taskManager.fetch({
      query: {
        match: {
          ['task.scope']: 'alert',
        },
      },
    });

    return docs.map(t => t.id);
  }

  public registerAlertTemplate(template: AlertTemplate) {
    if (!this.templatesMap.has(template.id)) {
      this.templatesMap.set(template.id, template);
      const defs = {};
      defs[`${template.id}`] = {
        type: template.id,
        title: template.id,
        description: template.description,
        timeOut: '500m',
        numWorkers: 1,
        static: [
          {
            id: 'someTaskId',
            type: template.id,
            scope: 'alert',
          },
        ],
        createTaskRunner(context: RunContext) {
          return {
            async run() {
              return new Promise((resolve, reject) => {
                try {
                  const results = template.check({
                    state: context.taskInstance.state,
                    params: context.taskInstance.params,
                  });

                  CheckResultType.validate(results);

                  if (results.notify) {
                    template.notify({
                      checkResults: results,
                      state: context.taskInstance.state,
                      params: context.taskInstance.params,
                    });
                  }

                  resolve();
                } catch (e) {
                  reject({
                    alert: template,
                    exception: e,
                  });
                }
              });
            },

            async cancel() {
              // Do whatever is required to cancel this task, such as killing any spawned processes
            },
          };
        },
      };
      this.taskManager.registerTaskDefinitions(defs);
    } else {
      throw new Error(`Alert Id name ${template.id} already taken`);
    }
  }

  public async registerAlert(templateId: string, params: any): Promise<string> {
    const task = await this.taskManager.schedule({
      id: templateId,
      taskType: 'alert:' + templateId,
      scope: 'alert',
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
    const tasks = await this.getAlerts();

    if (tasks !== undefined) {
      this.info(`We got ${tasks.length} tasks from task manager.`);
    }
  }
}
