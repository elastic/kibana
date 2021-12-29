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
  EVENT_ACTION_EXECUTE_START,
  PLUGIN_ID,
} from '../../../common/constants';
import { ErrorAction, ExecuteComplete, ExecuteError, ExecuteStart } from './types';

export interface ReportingEventLoggerOpts {
  event: Pick<ExecuteStart['event'], 'id' | 'timezone'>;
  kibana: Pick<ExecuteStart['kibana'], 'reporting'>;
  user?: ExecuteStart['user'];
}

/** @internal */
export function reportingEventLoggerFactory(eventLog: IEventLogService) {
  const genericLogger = eventLog.getLogger({ event: { provider: PLUGIN_ID } });

  return class ReportingEventLogger {
    readonly eventObj: {
      event: {
        id: string;
        timezone: string;
        provider: 'reporting';
      };
      kibana: { reporting: ExecuteStart['kibana']['reporting'] };
      log: { logger: 'reporting' };
      user?: { name: string };
    };

    completionLogger: IEventLogger;

    constructor(eventObj: ReportingEventLoggerOpts) {
      this.eventObj = {
        event: { provider: 'reporting', ...eventObj.event },
        kibana: { ...eventObj.kibana },
        log: { logger: 'reporting' },
        user: eventObj.user,
      };

      // create a "complete" logger that will use EventLog helpers to calculate timings
      this.completionLogger = eventLog.getLogger({ event: { provider: PLUGIN_ID } });
    }

    logStart(message: string): ExecuteStart {
      this.completionLogger.startTiming(this.eventObj);
      const event = deepMerge(
        {
          message,
          event: { kind: 'event', action: EVENT_ACTION_EXECUTE_START },
          log: { level: 'info' },
        } as Partial<ExecuteStart>,
        this.eventObj
      );

      genericLogger.logEvent(event);
      return event;
    }

    logComplete(
      message: string,
      reportingObj: Partial<ExecuteComplete['kibana']['reporting']>
    ): ExecuteComplete {
      this.completionLogger.stopTiming(this.eventObj);
      const event = deepMerge(
        {
          message,
          event: { kind: 'metrics', outcome: 'success', action: EVENT_ACTION_EXECUTE_COMPLETE },
          kibana: { reporting: reportingObj },
          log: { level: 'info' },
        } as Partial<ExecuteComplete>,
        this.eventObj
      );
      this.completionLogger.logEvent(event);
      return event;
    }

    logError(error: ErrorAction): ExecuteError {
      interface CoolErrorMessage {
        message: string;
        error: ExecuteError['error'];
        event: Omit<ExecuteError['event'], 'provider' | 'id' | 'timezone'>;
        log: Omit<ExecuteError['log'], 'logger'>;
      }
      const coolErrorMessage: CoolErrorMessage = {
        message: error.message,
        error: {
          message: error.message,
          code: error.code,
          stack_trace: error.stack_trace,
          type: error.type,
        },
        event: { kind: 'error', outcome: 'failure', action: EVENT_ACTION_EXECUTE_COMPLETE },
        log: { level: 'error' },
      };
      const event = deepMerge(coolErrorMessage, this.eventObj);
      genericLogger.logEvent(event);
      return event;
    }
  };
}

export type ReportingEventLogger = ReturnType<typeof reportingEventLoggerFactory>;
