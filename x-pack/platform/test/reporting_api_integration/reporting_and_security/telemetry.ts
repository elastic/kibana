/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { JobParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import type { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
import type { JobParamsPNGV2 } from '@kbn/reporting-export-types-png-common';
import type { SerializedConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { FtrProviderContext } from '../ftr_provider_context';

const pdfPayload: JobParamsPDFV2 = {
  browserTimezone: 'UTC',
  title: 'test PDF allowed',
  layout: { id: 'preserve_layout' },
  locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
  objectType: 'dashboard',
  version: '7.14.0',
};

const csvPayload: JobParamsCSV = {
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
};

const pngPayload: JobParamsPNGV2 = {
  browserTimezone: 'UTC',
  title: 'test PNG',
  layout: {
    id: 'preserve_layout',
    dimensions: { width: 375, height: 812 },
  },
  locatorParams: { id: 'canvas', version: '7.14.0', params: {} },
  objectType: 'dashboard',
  version: '8.13.0',
};

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const es = getService('es');

  describe('Reporting Telemetry', () => {
    let scheduledReportIds: string[] = [];

    before(async () => {
      await reportingAPI.initEcommerce();

      // schedule a bunch of reports
      const results = await Promise.all([
        reportingAPI.schedulePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          pdfPayload
        ),
        reportingAPI.scheduleCsv(
          csvPayload,
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD
        ),
        reportingAPI.schedulePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          pdfPayload
        ),
        reportingAPI.schedulePng(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          pngPayload
        ),
        reportingAPI.schedulePng(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          pngPayload
        ),
        reportingAPI.scheduleCsvWithNotification(
          csvPayload,
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD
        ),
        reportingAPI.scheduleCsvWithNotification(
          csvPayload,
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD
        ),
      ]);

      scheduledReportIds = results.map((report: any) => {
        expect(report.status).to.eql(200);
        return report.body.job.id;
      });

      // disable some reports
      const result = await reportingAPI.disableReportSchedules(
        [scheduledReportIds[1], scheduledReportIds[4]],
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );
      expect(result).to.eql({
        scheduled_report_ids: [scheduledReportIds[1], scheduledReportIds[4]],
        errors: [],
        total: 2,
      });
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteScheduledReports(scheduledReportIds);
      await reportingAPI.deleteTasks(scheduledReportIds);
    });

    it('should retrieve telemetry data in the expected format', async () => {
      // request telemetry task to run
      await reportingAPI.runTelemetryTask();

      // get the telemetry task
      await retry.try(async () => {
        const telemetryTask = await es.get<{
          type: string;
          task: SerializedConcreteTaskInstance;
        }>({
          id: 'task:Reporting-reporting_telemetry',
          index: '.kibana_task_manager',
        });

        expect(telemetryTask!._source!.task?.status).to.be('idle');
        const taskState = telemetryTask!._source!.task?.state;
        expect(taskState).not.to.be(undefined);
        const parsedState = JSON.parse(taskState!);

        expect(parsedState.runs > 0).to.be(true);
        expect(parsedState.number_of_scheduled_reports).to.equal(7);
        expect(parsedState.number_of_enabled_scheduled_reports).to.equal(5);
        expect(parsedState.number_of_scheduled_reports_by_type).to.eql({
          csv_searchsource: 3,
          PNGV2: 2,
          printable_pdf_v2: 2,
        });
        expect(parsedState.number_of_enabled_scheduled_reports_by_type).to.eql({
          csv_searchsource: 2,
          printable_pdf_v2: 2,
          PNGV2: 1,
        });
        expect(parsedState.number_of_scheduled_reports_with_notifications).to.equal(2);
      });
    });
  });
}
