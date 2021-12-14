/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { IEventLogger } from '../../../../event_log/server';
import { EVENT_ACTION_EXECUTE_START } from '../../../common/constants';
import { ExecuteStart } from './types';

export interface ReportingEventLoggerOpts {
  event: Pick<ExecuteStart['event'], 'id' | 'timezone'>;
  kibana: Pick<ExecuteStart['kibana'], 'reporting'>;
}

export function reportingEventLoggerFactory(logger: IEventLogger) {
  return class ReportingEventLogger {
    readonly eventObj: {
      event: { id: string; timezone: string; provider: 'reporting' };
      kibana: { reporting: ExecuteStart['kibana']['reporting'] };
      log: { logger: 'reporting' };
    };

    constructor(eventObj: ReportingEventLoggerOpts) {
      this.eventObj = {
        event: { provider: 'reporting', ...eventObj.event },
        kibana: { ...eventObj.kibana },
        log: { logger: 'reporting' },
      };
    }

    logStart(
      message: string,
      reportingObj: Partial<ExecuteStart['kibana']['reporting']>
    ): ExecuteStart {
      const action = EVENT_ACTION_EXECUTE_START as typeof EVENT_ACTION_EXECUTE_START;
      const event = deepMerge(
        {
          message,
          event: { kind: 'event' as const, action },
          kibana: { reporting: { ...reportingObj } },
          log: { level: 'info' as const },
        },
        this.eventObj
      );

      logger.logEvent(event);
      return event;
    }

    startTiming() {}

    stopTiming() {}

    logComplete() {}

    logError() {}
  };
}
