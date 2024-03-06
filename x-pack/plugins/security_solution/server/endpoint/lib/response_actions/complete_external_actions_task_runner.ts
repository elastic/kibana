/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CancellableTask, RunContext } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/core/server';
import { stringify } from '../../utils/stringify';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';
import type { BatchHandlerCallbackOptions } from '../../utils/queue_processor';
import { QueueProcessor } from '../../utils/queue_processor';
import type { LogsEndpointActionResponse } from '../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

/**
 * A task manager runner responsible for checking the status of and completing pending actions
 * that were sent to 3rd party EDR systems.
 */
export class CompleteExternalActionsTaskRunner
  implements CancellableTask<RunContext['taskInstance']>
{
  private readonly log: Logger;
  private updatesQueue: QueueProcessor<LogsEndpointActionResponse>;
  private abortController = new AbortController();

  constructor(
    private readonly endpointContextServices: EndpointAppContextService,
    private readonly nextRunInterval: string = '5m'
  ) {
    this.log = this.endpointContextServices.createLogger(
      // Adding a unique identifier to the end of the class name to help identify log entries related to this run
      `${this.constructor.name}.${Math.random().toString(32).substring(2, 8)}`
    );

    this.updatesQueue = new QueueProcessor<LogsEndpointActionResponse>({
      batchHandler: this.queueBatchProcessor.bind(this),
      batchSize: 50,
      logger: this.log,
    });
  }

  private async queueBatchProcessor(
    options: BatchHandlerCallbackOptions<LogsEndpointActionResponse>
  ): Promise<void> {
    // FIXME:PT implement
    this.log.error(`TODO: Batch processing:\n${stringify(options.data)}`);
  }

  private getNextRunDate(): Date | undefined {
    const nextRun = new Date();
    const nextRunInterval = this.nextRunInterval;

    if (nextRunInterval.endsWith('s')) {
      const seconds = parseInt(nextRunInterval.slice(0, -1), 10);
      nextRun.setSeconds(nextRun.getSeconds() + seconds);
    } else if (nextRunInterval.endsWith('m')) {
      const minutes = parseInt(nextRunInterval.slice(0, -1), 10);
      nextRun.setMinutes(nextRun.getMinutes() + minutes);
    } else {
      this.log.error(`Invalid task interval: ${nextRunInterval}`);
      return;
    }

    return nextRun;
  }

  public async run() {
    this.log.info(`Started: Checking status of external response actions`);
    this.abortController = new AbortController();

    // Collect update needed to complete response actions
    await Promise.all(
      RESPONSE_ACTION_AGENT_TYPE.filter((agentType) => agentType !== 'endpoint').map(
        (agentType) => {
          const agentTypeActionsClient =
            this.endpointContextServices.getInternalResponseActionsClient({ agentType });

          return agentTypeActionsClient.processPendingActions({
            abortSignal: this.abortController.signal,
            addToQueue: this.updatesQueue.addToQueue,
          });
        }
      )
    );

    await this.updatesQueue.complete();
    this.log.info(`Completed: Checking status of external response actions`);
    this.abortController.abort(`Run complete.`);

    return {
      state: {},
      runAt: this.getNextRunDate(),
    };
  }

  public async cancel() {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort('Task canceled by Task Manager');

      // Sleep 5 seconds to give an opportunity for the abort signal to be processed
      await new Promise((r) => setTimeout(r, 5000));

      // Wait for remainder of updates to be written
      await this.updatesQueue.complete();
    }
  }
}
