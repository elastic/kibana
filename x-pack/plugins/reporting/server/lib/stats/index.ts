/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { ReportingConfig } from '../..';
import { durationToNumber } from '../../../common/schema_utils';
import { ReportingStatsPayload } from '../../types';
import { ActionType } from '../event_logger';
import { ReportingAction } from '../event_logger/types';

export interface IReportingStats {
  durations: {
    scheduling: number;
    waiting: number;
    executing: number;
    saving: number;
  };
  queue: {
    scheduled: number;
    claimed: number;
    started: number;
    completed: number;
    retried: number;
    saved: number;
    failed: number;
    errors: number;
  };
  state: {
    status: 'idle' | 'processing';
    processing?: string;
  };
  jobTypes: { [jobType: string]: number };
  // TODO error codes
}

/**
 * A service to accumulate ReportingAction events directly from ReportingEventLogger
 * and summarize them into system stats
 */
export class ReportingStats {
  private events: ReportingAction[] = [];
  private state: IReportingStats = {
    durations: { scheduling: 0, waiting: 0, executing: 0, saving: 0 },
    jobTypes: {},
    queue: {
      scheduled: 0,
      claimed: 0,
      started: 0,
      completed: 0,
      retried: 0,
      saved: 0,
      failed: 0,
      errors: 0,
    },
    state: { status: 'idle' },
  };
  private readonly stats$: BehaviorSubject<IReportingStats> = new BehaviorSubject<IReportingStats>(
    this.state
  );

  constructor(private config: () => ReportingConfig, jobTypes: string[], private version: string) {
    // initialize the state's jobType keys
    jobTypes.forEach((jobType) => {
      this.state.jobTypes[jobType] = 0;
    });
  }

  private clearEvents() {
    this.events.length = 0;
  }

  private compileStats() {
    // make a copy of the cached events
    const events = [...this.events];

    // clear out the cache of events
    this.clearEvents();

    // TODO The more events exist, the more this will block the event loop. Partition the long synchronous into async
    this.state = events.reduce((compiled, event) => {
      const reportJobId = event.kibana.reporting.id;

      const { state, jobTypes, queue, durations } = compiled;
      const durationMs = event.event?.duration && event.event?.duration / 1000000;

      // state.status, state.processing
      switch (event.kibana.reporting.actionType) {
        case ActionType.EXECUTE_START:
          state.status = 'processing';
          state.processing = reportJobId;
          break;
        case ActionType.SAVE_REPORT:
        case ActionType.FAIL_REPORT:
          state.status = 'idle';
          state.processing = undefined;
      }

      // durations.*, queue.*
      switch (event.kibana.reporting.actionType) {
        case ActionType.SCHEDULE_TASK:
          if (durationMs) {
            durations.scheduling += durationMs;
          }
          queue.scheduled += 1;
          break;
        case ActionType.CLAIM_TASK: {
          if (durationMs) {
            durations.waiting += durationMs;
          }
          queue.claimed += 1;
          break;
        }
        case ActionType.EXECUTE_START:
          queue.started += 1;
          break;
        case ActionType.EXECUTE_COMPLETE:
          if (durationMs) {
            durations.executing += durationMs;
          }
          queue.completed += 1;
          break;
        case ActionType.RETRY:
          if (durationMs) {
            durations.scheduling += durationMs;
          }
          queue.retried += 1;
          break;
        case ActionType.SAVE_REPORT:
          if (durationMs) {
            durations.saving += durationMs;
          }
          queue.saved += 1;
          break;
        case ActionType.FAIL_REPORT:
          if (durationMs) {
            durations.saving += durationMs;
          }
          queue.failed += 1;
          break;
        case ActionType.EXECUTE_ERROR:
        default:
          queue.errors += 1;
      }

      // jobCount.*
      const jobCount = jobTypes[event.kibana.reporting.jobType] || 0;
      jobTypes[event.kibana.reporting.jobType] = jobCount + 1;
      return { ...compiled };
    }, this.state);

    return this.state;
  }

  public addEvent(event: ReportingAction) {
    this.events.push(event);
    this.stats$.next(this.compileStats());
  }

  public toApiJSON(): ReportingStatsPayload {
    const config = this.config();

    const pollEnabled = config.get('queue', 'pollEnabled');
    const timeout = durationToNumber(config.get('queue', 'timeout'));
    const maxAttempts = config.get('capture', 'maxAttempts');
    const legacyRolesEnabled = config.get('roles', 'enabled');

    return {
      config: {
        roles: { enabled: legacyRolesEnabled },
        queue: { pollEnabled, timeout },
        capture: { maxAttempts },
      },
      kibana: {
        uuid: config.kbnConfig.get('server', 'uuid'),
        host: config.kbnConfig.get('server', 'host'),
        name: config.kbnConfig.get('server', 'name'),
        basePath: config.kbnConfig.get('server', 'basePath'),
        version: this.version,
      },
      reports: this.stats$.getValue(),
    };
  }
}
