/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

export enum RuleRunTimerSpans {
  RuleTypeRunner = 'rule_type_runner',
  ProcessAlerts = 'process_alerts',
  TriggerActions = 'trigger_actions',
  StartRunning = 'start_running',
  PreRun = 'pre_run',
  PostRun = 'post_run',
}

interface RuleRunTimerOpts {
  logger: Logger;
}

export class RuleRunTimer {
  private timedRuns: Record<string, number> = {};

  constructor(private readonly options: RuleRunTimerOpts) {}

  /**
   * Calcuate the time passed since a given start time and store this
   * duration for the give name.
   */
  public setDuration(name: string, start: Date) {
    if (this.timedRuns[name]) {
      this.options.logger.warn(`Duration already exists for "${name}" and will be overwritten`);
    }

    // Calculate duration in millis from start until now and store
    this.timedRuns[name] = Date.now() - start.getTime();
  }

  public async runWithTimer<T>(name: string, cb: () => Promise<T>): Promise<T> {
    if (this.timedRuns[name]) {
      this.options.logger.warn(`Duration already exists for "${name}" and will be overwritten`);
    }

    const start = new Date();
    const result = await cb();
    const end = new Date();

    this.timedRuns[name] = end.getDate() - start.getDate();

    return result;
  }
}
