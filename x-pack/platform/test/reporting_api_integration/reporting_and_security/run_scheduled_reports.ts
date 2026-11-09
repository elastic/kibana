/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');

  const getTaskRunAt = async (taskId: string) => {
    const { body } = await reportingAPI.getTask(taskId);
    return { runAt: body._source.task.runAt as string, status: body._source.task.status as string };
  };

  const csvJob = (title: string): JobParamsCSV => ({
    browserTimezone: 'UTC',
    title,
    objectType: 'search',
    searchSource: {
      version: true,
      fields: [{ field: '*', include_unmapped: true }],
      index: '5193f870-d861-11e9-a311-0fa548c5f953',
    } as unknown as SerializedSearchSourceFields,
    columns: [],
    version: '7.13.0',
  });

  describe('Run Scheduled Reports', () => {
    const scheduledReportIds: string[] = [];

    // Start the schedules tomorrow so the only export a test sees is the one Run now creates.
    const startedAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const scheduleCsv = async (title: string, username: string, password: string) => {
      const report = await reportingAPI.scheduleCsv(
        csvJob(title),
        username,
        password,
        undefined,
        startedAt
      );
      expect(report.status).to.eql(200);
      const reportId: string = report.body.job.id;
      scheduledReportIds.push(reportId);
      return reportId;
    };

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
      const reportId = await scheduleCsv(
        'test CSV run now',
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      const { runAt: pendingRunAt } = await getTaskRunAt(reportId);

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );
      expect(res).to.eql({ id: reportId });

      const [finishedExport] = await reportingAPI.waitForScheduledReportRuns(reportId);
      expect(['completed', 'completed_with_warnings']).to.contain(finishedExport._source.status);

      const soResult = await reportingAPI.getScheduledReports(reportId);
      expect(soResult.body._source.scheduled_report.enabled).to.eql(true);

      // Task Manager writes the next run after the export finishes, so wait for the task to go idle.
      // The recurring schedule is unchanged: the next run is the occurrence that was pending before.
      await retry.tryForTime(30000, async () => {
        const task = await getTaskRunAt(reportId);
        expect(task.status).to.eql('idle');
        expect(task.runAt).to.eql(pendingRunAt);
      });
    });

    it('should not run a disabled schedule', async () => {
      const reportId = await scheduleCsv(
        'test CSV disabled',
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

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

    it('should return 404 for a schedule that does not exist', async () => {
      const res = await reportingAPI.runScheduledReport(
        'does-not-exist',
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        404
      );

      expect(res.message).to.eql('Not found.');
    });

    it('should not allow a user to run another users report without Manage Reporting', async () => {
      const reportId = await scheduleCsv(
        'test CSV not allowed',
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD
      );

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        404
      );

      expect(res.message).to.eql('Not found.');
    });

    it('should allow a user with Manage Reporting to run another users report', async () => {
      const reportId = await scheduleCsv(
        'test CSV managed',
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      const res = await reportingAPI.runScheduledReport(
        reportId,
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD
      );
      expect(res).to.eql({ id: reportId });

      await reportingAPI.waitForScheduledReportRuns(reportId);
    });
  });
}
