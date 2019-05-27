/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { makeApmUsageCollector } from '../lib/apm_telemetry';
import { ensureIndexPatternExists } from '../lib/index_pattern';
import { CoreSetupWithUsageCollector } from '../lib/apm_telemetry/make_apm_usage_collector';
import { initErrorsApi } from '../routes/errors';
import { initMetricsApi } from '../routes/metrics';
import { initServicesApi } from '../routes/services';
import { initTracesApi } from '../routes/traces';
import { initTransactionGroupsApi } from '../routes/transaction_groups';

export class Plugin {
  public setup(core: CoreSetup) {
    initTransactionGroupsApi(core);
    initTracesApi(core);
    initServicesApi(core);
    initErrorsApi(core);
    initMetricsApi(core);
    makeApmUsageCollector(core as CoreSetupWithUsageCollector);
    ensureIndexPatternExists(core);

    // Alerting POC
    setupExampleAlertingTask(core);

    core.http.server.route({
      method: 'POST',
      path: '/api/apm/alerts',
      options: {
        tags: ['access:apm']
      },
      handler: req => {
        const { intervalMinutes = 1, ...rest } = req.payload as {
          intervalMinutes?: number;
        };
        core.http.server.taskManager.schedule({
          type: 'exampleTask',
          interval: `${intervalMinutes}m`,
          ...rest
        });
      }
    });
  }
}

function setupExampleAlertingTask(core: CoreSetup) {
  core.http.server.taskManager.registerTaskDefinitions({
    // clusterMonitoring is the task type, and must be unique across the entire system
    exampleTask: {
      // Human friendly name, used to represent this task in logs, UI, etc
      title: 'Example task',

      // Optional, human-friendly, more detailed description
      description:
        'Playing with the task manager and understanding what it can do for observability products.',

      // Optional, how long, in minutes, the system should wait before
      // a running instance of this task is considered to be timed out.
      // This defaults to 5 minutes.
      timeout: '5m',

      // The clusterMonitoring task occupies 2 workers, so if the system has 10 worker slots,
      // 5 clusterMonitoring tasks could run concurrently per Kibana instance. This value is
      // overridden by the `override_num_workers` config value, if specified.
      numWorkers: 1,

      // The createTaskRunner function / method returns an object that is responsible for
      // performing the work of the task. context: { taskInstance, kbnServer }, is documented below.
      createTaskRunner(context: any) {
        return {
          // Perform the work of the task. The return value should fit the TaskResult interface, documented
          // below. Invalid return values will result in a logged warning.
          async run() {
            // Do some work
            // Conditionally send some alerts
            // Return some result or other...
            const { state, params } = context.taskInstance;
            const { metric } = params;
            const {
              consecutiveErrors: prevConsecutiveErrors = 0,
              id = 'n/a'
            } = state;
            const value = Math.random();
            const valid = value > params.threshold;
            const consecutiveErrors = valid ? 0 : prevConsecutiveErrors + 1;

            console.log(
              `ID: ${id} | ${new Date()} | Running example task with ${metric}: ${value} (valid: ${valid})`
            );

            console.log(`Consecutive errors: ${consecutiveErrors}`);

            if (!valid && consecutiveErrors > params.maxConsecutiveErrors) {
              console.log(
                `ALERT: CONSECUTIVE ERRORS ALERT - ${metric} at ${value} - alert no. ${consecutiveErrors -
                  params.maxConsecutiveErrors}`
              );
            }

            if (valid && prevConsecutiveErrors > params.maxConsecutiveErrors) {
              console.log(`ALERT: CONSECUTIVE ERRORS CLEARED FOR ${metric}`);
            }

            return {
              state: {
                id:
                  state.id ||
                  new Date()
                    .getTime()
                    .toString()
                    .slice(6),
                previousValue: value,
                consecutiveErrors
              }
            };
          },

          // Optional, will be called if a running instance of this task times out, allowing the task
          // to attempt to clean itself up.
          async cancel() {
            // Do whatever is required to cancel this task, such as killing any spawned processes
            console.log('Cancelling example task');
          }
        };
      }
    }
  });
}
