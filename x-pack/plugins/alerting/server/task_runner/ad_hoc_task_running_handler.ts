/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { adHocRunStatus } from '../../common/constants';
import { AdHocRunSchedule } from '../data/ad_hoc_run/types';
import { partiallyUpdateAdHocRun } from './lib';

const TIME_TO_WAIT = 2000;

export class AdHocTaskRunningHandler {
  private client: ISavedObjectsRepository;
  private logger: Logger;

  private runningTimeoutId?: NodeJS.Timeout;
  private isUpdating: boolean = false;
  private runningPromise?: Promise<void>;

  constructor(client: ISavedObjectsRepository, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  public start(adHocRunParamsId: string, schedule: AdHocRunSchedule[], namespace?: string) {
    this.runningTimeoutId = setTimeout(() => {
      this.setRunning(adHocRunParamsId, schedule, namespace);
    }, TIME_TO_WAIT);
  }

  public stop() {
    if (this.runningTimeoutId) {
      clearTimeout(this.runningTimeoutId);
    }
  }

  public async waitFor(): Promise<void> {
    this.stop();
    if (this.isUpdating && this.runningPromise) return this.runningPromise;
    else return Promise.resolve();
  }

  private setRunning(adHocRunParamsId: string, schedule: AdHocRunSchedule[], namespace?: string) {
    this.isUpdating = true;
    this.runningPromise = partiallyUpdateAdHocRun(
      this.client,
      adHocRunParamsId,
      { status: adHocRunStatus.RUNNING, schedule },
      {
        ignore404: true,
        namespace,
        refresh: false,
      }
    );
    this.runningPromise
      .then(() => {
        this.runningPromise = undefined;
        this.isUpdating = false;
      })
      .catch((err) => {
        this.runningPromise = undefined;
        this.isUpdating = false;
        this.logger.error(
          `error updating status and schedule attribute for ad hoc run ${adHocRunParamsId} ${err.message}`
        );
      });
  }
}
