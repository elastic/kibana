/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');

  describe('Update Scheduled Reports', () => {
    let scheduledReportIds: string[] = [];
    const updatedTitle = 'Updated title';
    const updatedSchedule = {
      rrule: {
        freq: 3, // Daily
        interval: 1,
        tzid: 'UTC',
        byweekday: ['MO'],
        byhour: [20],
        byminute: [30],
      },
    };

    before(async () => {
      await reportingAPI.initEcommerce();
    });

    afterEach(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteReportSchedules(scheduledReportIds);
      await reportingAPI.deleteTasks(scheduledReportIds);
      scheduledReportIds = [];
    });

    it('should allow reporting user to update their own scheduled report', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF allowed',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        }
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;

      scheduledReportIds.push(reportId);
      const res = await reportingAPI.updateScheduledReport(
        reportId,
        updatedTitle,
        updatedSchedule,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      expect(res.id).to.eql(reportId);
      expect(res.title).to.eql(updatedTitle);
      expect(res.schedule).to.eql(updatedSchedule);

      const taskResult = await reportingAPI.getTask(reportId);
      expect(taskResult.body._source?.task.schedule).to.eql(updatedSchedule);
    });

    it('should not allow user to update other users reports when no ManageReporting feature privilege', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF allowed',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'visualization',
          version: '7.14.0',
        }
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;

      scheduledReportIds.push(reportId);

      // report created by manage reporting user, reporting user should not be able to update
      await reportingAPI.updateScheduledReport(
        reportId,
        updatedTitle,
        updatedSchedule,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        404
      );
    });

    it('should allow user to update other users reports when they have ManageReporting feature privilege', async () => {
      const report = await reportingAPI.scheduleCsv(
        {
          browserTimezone: 'UTC',
          title: 'allowed search',
          objectType: 'search',
          searchSource: {
            version: true,
            fields: [{ field: '*', include_unmapped: true }],
            index: '5193f870-d861-11e9-a311-0fa548c5f953',
          } as unknown as SerializedSearchSourceFields,
          columns: [],
          version: '7.13.0',
        },
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;

      scheduledReportIds.push(reportId);
      const res = await reportingAPI.updateScheduledReport(
        reportId,
        updatedTitle,
        updatedSchedule,
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD
      );

      expect(res.id).to.eql(reportId);
      expect(res.title).to.eql(updatedTitle);
      expect(res.schedule).to.eql(updatedSchedule);

      const taskResult = await reportingAPI.getTask(reportId);
      expect(taskResult.body._source?.task.schedule).to.eql(updatedSchedule);
    });
  });
}
