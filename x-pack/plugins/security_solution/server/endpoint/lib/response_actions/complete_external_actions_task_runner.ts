/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CancellableTask, RunContext } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/core/server';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';

/**
 * A task manager runner responsible for checking the status of and completing pending actions
 * that were sent to 3rd party EDR systems.
 */
export class CompleteExternalActionsTaskRunner
  implements CancellableTask<RunContext['taskInstance']>
{
  private readonly log: Logger;

  // FIXME:PT add AbortController

  constructor(
    private readonly endpointContextServices: EndpointAppContextService,
    private readonly nextRunInterval: string = '5m'
  ) {
    this.log = this.endpointContextServices.createLogger(
      // Adding a unique identifier to the end of the class name to help identify log entries related to this run
      `${this.constructor.name}.${Math.random().toString(32).substring(2, 8)}`
    );
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

    // TODO:PT implement

    this.log.info(`Completed: Checking status of external response actions`);

    return {
      state: {},
      runAt: this.getNextRunDate(),
    };
  }

  public async cancel() {
    // TODO:PT implement
  }
}
