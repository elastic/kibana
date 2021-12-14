/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { EVENT_ACTION_EXECUTE_START } from '../../../common/constants';
import { ExecuteStart } from './types';

interface ConstructOpts {
  event: Pick<ExecuteStart['event'], 'id' | 'timezone'>;
  kibana: Pick<ExecuteStart['kibana'], 'reporting'>;
}

export class ReportingEventLogger {
  readonly eventObj: {
    event: { id: string; timezone: string; provider: 'reporting' };
    kibana: { reporting: ExecuteStart['kibana']['reporting'] };
    log: { logger: 'reporting' };
  };

  constructor(eventObj: ConstructOpts) {
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
    return deepMerge(
      {
        message,
        event: { kind: 'event' as const, action },
        kibana: { reporting: { ...reportingObj } },
        log: { level: 'info' as const },
      },
      this.eventObj
    );
  }

  logComplete() {}
}
