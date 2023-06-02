/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { partiallyUpdateAlert } from '../saved_objects/partially_update_alert';

const TIME_TO_WAIT = 2000;

export class RunningHandler {
  private client: ISavedObjectsRepository;
  private logger: Logger;
  private ruleTypeId: string;

  private runningTimeoutId?: NodeJS.Timeout;
  private isUpdating: boolean = false;
  private runningPromise?: Promise<void>;

  constructor(client: ISavedObjectsRepository, logger: Logger, ruleTypeId: string) {
    this.client = client;
    this.logger = logger;
    this.ruleTypeId = ruleTypeId;
  }

  public start(ruleId: string, namespace?: string) {
    this.runningTimeoutId = setTimeout(() => {
      this.setRunning(ruleId, namespace);
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

  private setRunning(ruleId: string, namespace?: string) {
    this.isUpdating = true;
    this.runningPromise = partiallyUpdateAlert(
      this.client,
      ruleId,
      { running: true },
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
          `error updating running attribute rule for ${this.ruleTypeId}:${ruleId} ${err.message}`
        );
      });
  }
}
