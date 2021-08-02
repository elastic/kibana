/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import { ReportingCore } from '../../core';
import { SchedulingStore } from '../../lib/store';
import { ReportingUser, ScheduleIntervalSchemaType } from '../../types';
import { JobsQueryFactory, jobsQueryFactory } from './jobs_query';

export class SchedulesQueryFactory {
  private jobsQuery: JobsQueryFactory;
  private scheduleStore?: SchedulingStore;

  constructor(private reporting: ReportingCore) {
    this.jobsQuery = jobsQueryFactory(reporting);
  }

  private async getStore() {
    if (!this.scheduleStore) {
      const [, scheduleStore] = await this.reporting.getStores();
      this.scheduleStore = scheduleStore;
    }
    return this.scheduleStore;
  }

  public async list(req: KibanaRequest, user: ReportingUser) {
    return (await this.getStore()).list(req, user);
  }

  // find an existing report ID to schedule
  public async scheduleById(
    req: KibanaRequest,
    user: ReportingUser,
    reportId: string,
    interval: ScheduleIntervalSchemaType,
    timezone: string
  ) {
    // fetch the job params of the report
    const store = await this.getStore();
    const report = await this.jobsQuery.get(user, reportId);

    if (!report) {
      throw new Error(`invalid report_id ${reportId}`);
    }

    const { forceNow: _forceNow, ...reportPayload } = report.payload; // strip forceNow from the payload
    const jobPayload = {
      headers: 'FIXME',
      ...reportPayload,
    };

    if (jobPayload.isDeprecated) {
      throw new Error(`Unable to schedule a deprecated report type!`);
    }

    const schedulePayload = {
      jobtype: report.jobtype,
      payload: jobPayload,
      interval,
      timezone,
    };

    // create the schedule in the reporting schedule index
    const schedule = await store.addSchedule(req, schedulePayload);

    // schedule the task with task manager

    return { schedule };
  }
}
