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

export class AlertService {
  private conditions: AlertCondition[] = [];
  private condMap = new Map<string, AlertCondition>();
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
        actions: [
          {
            name: { type: 'keyword' },
            params: { type: 'object' },
          },
        ],
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
      handler: (_: any, reply: any) => {
        reply('Hello World!');
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

  public getConditions(): string[] {
    return Object.keys(this.condMap);
  }

  public registerCondition(cond: AlertCondition) {
    if (!this.condMap.has(cond.name)) {
      this.conditions.push(cond);
      this.condMap[cond.name] = cond;
    } else {
      throw new Error('Condition name already taken');
    }
  }

  public registerAlert(condName: string, params: any): string {
    const guid = 'abc';
    this.alerts[guid] = {
      condition: this.condMap[condName],
      params,
    };

    /* create task */
    return guid;
  }

  public async start() {
    return {
      registerCondition: this.registerCondition,
    };
  }

  public async info(message: string) {
    this.kbnServer.server.log(['info', 'alert-service'], message);
  }

  private async initAfterPlugins() {
    const es = this.kbnServer.server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
    try {
      const index = await es('indices.create', { index: '.alerts' });
      this.info(`Index is ${JSON.stringify(index, null, 2)}`);
    } catch (err) {
      if ('resource_already_exists_exception' !== err.body.error.type) {
        throw err;
      }
    }
    es('indices.putMapping', {
      index: '.alerts',
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
