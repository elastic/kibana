/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Moment } from 'moment';
import { CreateEvents } from '../lib/create_events';
import { Config, ParsedSchedule } from '../types';

interface Params {
  client: ElasticsearchClient;
  config: Config;

  schedule: ParsedSchedule;
  end: Moment | false;
  currentTimestamp: Moment;

  continueIndexing: boolean;
  logger: Logger;
}

export class JobRegistry {
  private isRunning: boolean = false;
  private job: CreateEvents | undefined = undefined;

  public async start(params: Params) {
    if (this.isRunning) {
      throw new Error('Async function is already running.');
    }

    this.job = new CreateEvents({ client: params.client, logger: params.logger });
    this.job.start(params);

    this.isRunning = true;
  }

  public getStatus() {
    return this.isRunning;
  }

  public stop() {
    this.job?.stop();
    this.isRunning = false;
  }
}
