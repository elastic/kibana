/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { IEventLogger, IEventLogService } from '../../../../event_log/server';
import {
  EVENT_ACTION_EXECUTE_COMPLETE,
  EVENT_ACTION_EXECUTE_ERROR,
  EVENT_ACTION_EXECUTE_START,
  PLUGIN_ID,
} from '../../../common/constants';
import { ErrorAction, ExecuteComplete, ExecuteError, ExecuteStart } from './types';

export interface ReportingEventLoggerOpts {
  event: Pick<ExecuteStart['event'], 'id' | 'timezone'>;
  kibana: Pick<ExecuteStart['kibana'], 'reporting'>;
}

export function reportingEventLoggerFactory(eventLog: IEventLogService) {
  const genericLogger = eventLog.getLogger({ event: { provider: PLUGIN_ID } });

  return class ReportingEventLogger {
    readonly eventObj: {
      event: { id: string; timezone: string; provider: 'reporting' };
      kibana: { reporting: ExecuteStart['kibana']['reporting'] };
      log: { logger: 'reporting' };
    };

    completionLogger: IEventLogger;

    constructor(eventObj: ReportingEventLoggerOpts) {
      this.eventObj = {
        event: { provider: 'reporting', ...eventObj.event },
        kibana: { ...eventObj.kibana },
        log: { logger: 'reporting' },
      };

      // create a "complete" logger that will use helper functions and calculate timings
      this.completionLogger = eventLog.getLogger({ event: { provider: PLUGIN_ID } });
    }

    logStart(message: string): ExecuteStart {
      const action = EVENT_ACTION_EXECUTE_START as typeof EVENT_ACTION_EXECUTE_START;
      const event = deepMerge(
        {
          message,
          event: { kind: 'event' as const, action },
          log: { level: 'info' as const },
        },
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    startTiming() {
      this.completionLogger.startTiming(this.eventObj);
    }

    logComplete(
      message: string,
      reportingObj: Partial<ExecuteComplete['kibana']['reporting']>
    ): ExecuteComplete {
      this.completionLogger.stopTiming(this.eventObj);
      const action = EVENT_ACTION_EXECUTE_COMPLETE as typeof EVENT_ACTION_EXECUTE_COMPLETE;
      const event = deepMerge(
        {
          message,
          event: { kind: 'metrics' as const, action },
          kibana: { reporting: { ...reportingObj } },
          log: { level: 'info' as const },
        },
        this.eventObj
      );
      this.completionLogger.logEvent(event);
      return event;
    }

    logError(error: ErrorAction): ExecuteError {
      const action = EVENT_ACTION_EXECUTE_ERROR as typeof EVENT_ACTION_EXECUTE_ERROR;
      const event = deepMerge(
        {
          message: error.message,
          error: {
            message: error.message,
            code: error.code,
            stack_trace: error.stack_trace,
            type: error.type,
          },
          event: { kind: 'error' as const, action },
          kibana: { reporting: {} },
          log: { level: 'error' as const },
        },
        this.eventObj
      );
      genericLogger.logEvent(event);
      return event;
    }
  };
}
