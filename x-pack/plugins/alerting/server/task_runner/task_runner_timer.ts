/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';

export enum TaskRunnerTimerSpan {
  StartTaskRun = 'claim_to_start_duration_ms',
  TotalRunDuration = 'total_run_duration_ms',
  PrepareRule = 'prepare_rule_duration_ms',
  RuleTypeRun = 'rule_type_run_duration_ms',
  ProcessAlerts = 'process_alerts_duration_ms',
  PersistAlerts = 'persist_alerts_duration_ms',
  TriggerActions = 'trigger_actions_duration_ms',
  ProcessRuleRun = 'process_rule_duration_ms',
}

export type TaskRunnerTimings = Record<TaskRunnerTimerSpan, number>;
interface TaskRunnerTimerOpts {
  logger: Logger;
}

export class TaskRunnerTimer {
  private timings: Record<string, number> = {};

  constructor(private readonly options: TaskRunnerTimerOpts) {}

  /**
   * Calcuate the time passed since a given start time and store this
   * duration for the give name.
   */
  public setDuration(name: TaskRunnerTimerSpan, start: Date) {
    if (this.timings[name]) {
      this.options.logger.warn(`Duration already exists for "${name}" and will be overwritten`);
    }

    // Calculate duration in millis from start until now and store
    this.timings[name] = new Date().getTime() - start.getTime();
  }

  public async runWithTimer<T>(name: TaskRunnerTimerSpan, cb: () => Promise<T>): Promise<T> {
    if (this.timings[name]) {
      this.options.logger.warn(`Duration already exists for "${name}" and will be overwritten`);
    }

    const start = new Date();
    const result = await cb();
    const end = new Date();

    this.timings[name] = end.getTime() - start.getTime();

    return result;
  }

  public toJson(): TaskRunnerTimings {
    return {
      [TaskRunnerTimerSpan.StartTaskRun]: this.timings[TaskRunnerTimerSpan.StartTaskRun] ?? 0,
      [TaskRunnerTimerSpan.TotalRunDuration]:
        this.timings[TaskRunnerTimerSpan.TotalRunDuration] ?? 0,
      [TaskRunnerTimerSpan.PrepareRule]: this.timings[TaskRunnerTimerSpan.PrepareRule] ?? 0,
      [TaskRunnerTimerSpan.RuleTypeRun]: this.timings[TaskRunnerTimerSpan.RuleTypeRun] ?? 0,
      [TaskRunnerTimerSpan.ProcessAlerts]: this.timings[TaskRunnerTimerSpan.ProcessAlerts] ?? 0,
      [TaskRunnerTimerSpan.PersistAlerts]: this.timings[TaskRunnerTimerSpan.PersistAlerts] ?? 0,
      [TaskRunnerTimerSpan.TriggerActions]: this.timings[TaskRunnerTimerSpan.TriggerActions] ?? 0,
      [TaskRunnerTimerSpan.ProcessRuleRun]: this.timings[TaskRunnerTimerSpan.ProcessRuleRun] ?? 0,
    };
  }
}
