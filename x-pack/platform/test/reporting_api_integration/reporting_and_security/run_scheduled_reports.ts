/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');

  describe('Run Scheduled Reports', () => {
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

    it('should allow a reporting user to run their own scheduled report', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF run now',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        }
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;
      scheduledReportIds.push(reportId);

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      expect(res).to.eql({ id: reportId });

      const soResult = await reportingAPI.getScheduledReports(reportId);
      expect(soResult.body._source.scheduled_report.enabled).to.eql(true);
    });

    it('should not run a disabled schedule', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF disabled',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        }
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;
      scheduledReportIds.push(reportId);

      await reportingAPI.disableReportSchedules(
        [reportId],
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        400
      );

      expect(res.message).to.eql('Scheduled report is disabled.');
    });

    it('should not allow a user to run another users report without Manage Reporting', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF not allowed',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'visualization',
          version: '7.14.0',
        }
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;
      scheduledReportIds.push(reportId);

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        404
      );

      expect(res.message).to.eql('Not found.');
    });

    it('should allow a user with Manage Reporting to run another users report', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test PDF managed',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        }
      );

      expect(report.status).to.eql(200);
      const reportId = report.body.job.id;
      scheduledReportIds.push(reportId);

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD
      );

      expect(res).to.eql({ id: reportId });
    });
  });
}
