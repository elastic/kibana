/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from 'kibana/server';
import type { LevelLogger } from '../..';
import type { ReportingCore } from '../../..';
import { SCHEDULED_REPORTS_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import type { ScheduleIntervalSchemaType } from '../../../config';
import type { BasePayload, ReportingUser } from '../../../types';

export interface ReportSchedulePayload {
  jobtype: string;
  payload: BasePayload;
  interval: ScheduleIntervalSchemaType;
  timezone: string;
}

export class SchedulingStore {
  constructor(private reporting: ReportingCore, private logger: LevelLogger) {
    this.logger = logger.clone(['schedule_store']);
    this.logger.info(`Initializing schedule store`);
  }

  public async list(req: KibanaRequest, _user: ReportingUser) {
    const client = await this.reporting.getSavedObjectsClient(req);
    return client.find({ type: SCHEDULED_REPORTS_SAVED_OBJECT_TYPE });
  }

  public async addSchedule(req: KibanaRequest, schedulePayload: ReportSchedulePayload) {
    const client = await this.reporting.getSavedObjectsClient(req);
    return await client.create(SCHEDULED_REPORTS_SAVED_OBJECT_TYPE, schedulePayload, {
      references: undefined, // FIXME must reference the task saved object
    });
  }
}
