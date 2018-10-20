/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

interface AlertCondition {
  name: string;
  runnable(params: any): boolean;
}

export class AlertService {
  private conditions: AlertCondition[] = [];
  private condMap: any = {};
  private alerts: any = {};
  private kbnServer: any;
  private config: any;

  constructor(kbnServer: any, config: any) {
    this.kbnServer = kbnServer;
    this.config = config;

    const server = this.kbnServer.server;
    const tm = server.plugins;
    server.log(['warning', 'alert-service'], `Task Manager ${Object.keys(tm).join(', ')}`);
    server.log(['warning', 'alert-service'], 'Hello!');
    server.route({
      method: 'GET',
      path: '/api/alerts',
      handler: (req: any, reply: any) => {
        reply('Hello World!');
      },
    });

    const { taskManager } = server;
    taskManager.registerTaskDefinitions({
      // clusterMonitoring is the task type, and must be unique across the entire system
      clusterMonitoring: {
        // Human friendly name, used to represent this task in logs, UI, etc
        title: 'Human friendly name',

        // Optional, human-friendly, more detailed description
        description: 'Amazing!!',

        // Optional, how long, in minutes, the system should wait before
        // a running instance of this task is considered to be timed out.
        // This defaults to 5 minutes.
        timeOut: '5m',

        // The clusterMonitoring task occupies 2 workers, so if the system has 10 worker slots,
        // 5 clusterMonitoring tasks could run concurrently per Kibana instance. This value is
        // overridden by the `override_num_workers` config value, if specified.
        numWorkers: 2,

        // The createTaskRunner function / method returns an object that is responsible for
        // performing the work of the task. context: { taskInstance, kbnServer }, is documented below.
        createTaskRunner() {
          return {
            async run() {
              server.log(
                ['info', 'alert-service'],
                'I am an alerting service task that is running'
              );
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

    const runTime = `${moment().toString()}`;
    this.kbnServer.afterPluginsInit(async () => {
      server.log(['warning', 'alert-service'], `Task Manager ${Object.keys(server).join(', ')}`);
      // const task = await taskManager.schedule({
      //   taskType: 'clusterMonitoring',
      //   runAt: '2018-10-19T16:00:00.000',
      //   interval: '10m',
      //   params: { key: 'params' },
      //   scope: 'my-fanci-app',
      // });
      const tasks = await taskManager.fetch({ scope: 'my-fanci-app' });
      if (tasks !== undefined) {
        tasks.map((task: any) => {
          server.log(['info', 'alert-service'], `Destroying task ${task.id}`);
          taskManager.remove({ id: task.id });
          return {};
        });
      }
    });
  }

  public getConditions(): string[] {
    return Object.keys(this.condMap);
  }

  public registerCondition(cond: AlertCondition) {
    this.conditions.push(cond);
    this.condMap[cond.name] = cond;
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
}
