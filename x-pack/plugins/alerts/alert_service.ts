/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskManager } from '../task_manager/task_manager';

interface AlertCondition {
  name: string;
  runnable(params: any): boolean;
}

interface AlertTemplate {
  id: string;

  description: string;

  runnable: (context: any) => {};
}

export class AlertService {
  private templates: AlertTemplate[] = [];
  private templatesMap = new Map<string, AlertTemplate>();
  private alerts: any = {};
  private kbnServer: any;
  private taskManager: TaskManager;
  private alertIndexProperties: any = {
    type: { type: 'keyword' },
    alert: {
      properties: {
        task: {
          properties: {
            id: { type: 'keyword' },
            type: { type: 'keyword' },
          },
        },
        condition: {
          properties: {
            name: { type: 'keyword' },
          },
        },
        actions: {
          properties: {
            name: { type: 'keyword' },
            params: { type: 'object' },
          },
        },
        interval: { type: 'text' },
        state: { type: 'keyword' },
        user: { type: 'keyword' },
        scope: { type: 'keyword' },
      },
    },
  };

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

    const info = this.info.bind(this);
    this.taskManager = server.taskManager;
    this.taskManager.registerTaskDefinitions({
      // clusterMonitoring is the task type, and must be unique across the entire system
      clusterMonitoring: {
        type: 'clusterMonitoring',
        title: 'Human friendly name', // Human friendly name, used to represent this task in logs, UI, etc
        description: 'Amazing!!', // Optional, human-friendly, more detailed description
        timeOut: '5m',
        numWorkers: 2,

        // The createTaskRunner function / method returns an object that is responsible for
        // performing the work of the task. context: { taskInstance, kbnServer }, is documented below.
        createTaskRunner() {
          return {
            async run() {
              info('I am an alerting service task that is running');
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

    this.kbnServer.afterPluginsInit(this.initAfterPlugins.bind(this));
  }

  public getTemplates(): string[] {
    return Object.keys(this.templatesMap);
  }

  public registerAlertTemplate(template: AlertTemplate) {
    if (!this.templatesMap.has(template.id)) {
      this.templatesMap.set(template.id, template);
    } else {
      throw new Error('Condition name already taken');
    }
  }

  public registerAlert(templateId: string, params: any): string {
    const guid = 'abc';
    this.alerts[guid] = {
      template: this.templatesMap.get(templateId),
      params,
    };

    /* create task */
    return guid;
  }

  public async start() {
    return {
      registerAlertTemplate: this.registerAlertTemplate,
    };
  }

  public async info(message: string) {
    this.kbnServer.server.log(['info', 'alert-service'], message);
  }

  private async initAfterPlugins() {
    const es = this.kbnServer.server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
    try {
      const index = await es('indices.create', { index: '.kibana-alerts' });
      this.info(`Index is ${JSON.stringify(index, null, 2)}`);
    } catch (err) {
      if (err.body && 'resource_already_exists_exception' !== err.body.error.type) {
        throw err;
      }
    }
    es('indices.putMapping', {
      index: '.kibana-alerts',
      type: '_doc',
      body: {
        properties: this.alertIndexProperties,
      },
    });

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
