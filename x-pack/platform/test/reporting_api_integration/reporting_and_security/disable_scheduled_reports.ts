/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');

  describe('Disable Scheduled Reports', () => {
    const scheduledReportIds: string[] = [];

    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteScheduledReports(scheduledReportIds);
      await reportingAPI.deleteTasks(scheduledReportIds);
    });

    it('should allow reporting user to disable their own scheduled report', async () => {
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

      // report created by reporting user, reporting user should be able to disable
      const res = await reportingAPI.disableScheduledReports(
        [reportId],
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      expect(res).to.eql({ scheduled_report_ids: [reportId], errors: [], total: 1 });

      const soResult = await reportingAPI.getScheduledReports(reportId);
      expect(soResult.body._source.scheduled_report.enabled).to.eql(false);
      const taskResult = await reportingAPI.getTask(reportId);
      expect(taskResult.body._source?.task.enabled).to.eql(false);
    });

    it('should not allow user to disable other users reports when no ManageReporting feature privilege', async () => {
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

      // report created by manage reporting user, reporting user should not be able to disable
      const res = await reportingAPI.disableScheduledReports(
        [reportId],
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      expect(res).to.eql({
        scheduled_report_ids: [],
        errors: [
          {
            message: `Not found.`,
            status: 404,
            id: reportId,
          },
        ],
        total: 1,
      });

      const soResult = await reportingAPI.getScheduledReports(reportId);
      expect(soResult.body._source.scheduled_report.enabled).to.eql(true);
      const taskResult = await reportingAPI.getTask(reportId);
      expect(taskResult.body._source?.task.enabled).to.eql(true);
    });

    it('should allow user to disable other users reports when they have ManageReporting feature privilege', async () => {
      const report1 = await reportingAPI.scheduleCsv(
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

      const report2 = await reportingAPI.schedulePdf(
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

      expect(report1.status).to.eql(200);
      expect(report2.status).to.eql(200);

      const report1Id = report1.body.job.id;
      const report2Id = report2.body.job.id;

      scheduledReportIds.push(report1Id);
      scheduledReportIds.push(report2Id);

      // manage reporting user should be able to disable their own report and reporting user report
      const res = await reportingAPI.disableScheduledReports(
        [report1Id, report2Id],
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD
      );

      expect(res).to.eql({ scheduled_report_ids: [report1Id, report2Id], errors: [], total: 2 });

      const soResult1 = await reportingAPI.getScheduledReports(report1Id);
      expect(soResult1.body._source.scheduled_report.enabled).to.eql(false);
      const soResult2 = await reportingAPI.getScheduledReports(report2Id);
      expect(soResult2.body._source.scheduled_report.enabled).to.eql(false);
      const taskResult1 = await reportingAPI.getTask(report1Id);
      expect(taskResult1.body._source?.task.enabled).to.eql(false);
      const taskResult2 = await reportingAPI.getTask(report2Id);
      expect(taskResult2.body._source?.task.enabled).to.eql(false);
    });
  });
}
