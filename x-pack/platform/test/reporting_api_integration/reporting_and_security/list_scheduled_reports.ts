/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { JobParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import type { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
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

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const es = getService('es');

  describe('List Scheduled Reports', () => {
    let report1Id: string;
    let report2Id: string;
    let report3Id: string;
    const scheduledReportIds: string[] = [];

    before(async () => {
      await reportingAPI.initEcommerce();

      const report1 = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        pdfPayload
      );

      const report2 = await reportingAPI.scheduleCsv(
        csvPayload,
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      const report3 = await reportingAPI.schedulePdf(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        pdfPayload
      );

      expect(report1.status).to.eql(200);
      expect(report2.status).to.eql(200);
      expect(report3.status).to.eql(200);

      report1Id = report1.body.job.id;
      report2Id = report2.body.job.id;
      report3Id = report3.body.job.id;

      scheduledReportIds.push(report1Id);
      scheduledReportIds.push(report2Id);
      scheduledReportIds.push(report3Id);
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteScheduledReports(scheduledReportIds);
      await reportingAPI.deleteTasks(scheduledReportIds);
    });

    it('should only return reports scheduled by the user when user does not have ManageReporting feature privilege', async () => {
      const res = await reportingAPI.listScheduledReports(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      expect(res.total).to.eql(2);

      for (const report of res.data) {
        expect(report.created_by).to.eql(reportingAPI.REPORTING_USER_USERNAME);
        expect([report1Id, report2Id]).to.contain(report.id);
        expect(report.next_run).not.to.be(undefined);
        expect(report.space_id).to.eql('default');
        expect(report.schedule).to.have.property('rrule');
        expect(report.enabled).to.be(true);
        expect(report.payload).to.have.property('objectType');
        expect(report.payload).to.have.property('browserTimezone');
        expect(report.payload).to.have.property('title');
      }
    });

    it('should return reports scheduled by all users when user has ManageReporting feature privilege', async () => {
      const res = await reportingAPI.listScheduledReports(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD
      );

      expect(res.total).to.eql(3);

      for (const report of res.data) {
        expect([
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        ]).to.contain(report.created_by);
        expect([report1Id, report2Id, report3Id]).to.contain(report.id);
        expect(report.next_run).not.to.be(undefined);
        expect(report.space_id).to.eql('default');
        expect(report.schedule).to.have.property('rrule');
        expect(report.enabled).to.be(true);
        expect(report.payload).to.have.property('objectType');
        expect(report.payload).to.have.property('browserTimezone');
        expect(report.payload).to.have.property('title');
      }
    });

    it('should search reports by title when a search string is provided', async () => {
      const res = await reportingAPI.listScheduledReports(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        'PDF'
      );

      expect(res.total).to.eql(2);

      for (const report of res.data) {
        expect(report.payload.title).to.equal(pdfPayload.title);
      }
    });

    it('should search reports by author when a search string is provided', async () => {
      let res = await reportingAPI.listScheduledReports(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        reportingAPI.REPORTING_USER_USERNAME
      );

      for (const report of res.data) {
        expect(report.created_by).to.equal(reportingAPI.REPORTING_USER_USERNAME);
      }

      res = await reportingAPI.listScheduledReports(
        reportingAPI.MANAGE_REPORTING_USER_USERNAME,
        reportingAPI.MANAGE_REPORTING_USER_PASSWORD,
        reportingAPI.MANAGE_REPORTING_USER_USERNAME
      );

      for (const report of res.data) {
        expect(report.created_by).to.equal(reportingAPI.MANAGE_REPORTING_USER_USERNAME);
      }
    });

    it('does not return a report owned by the same username in another realm', async () => {
      const report = await reportingAPI.schedulePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        pdfPayload
      );
      expect(report.status).to.eql(200);
      const foreignRealmReportId = report.body.job.id;
      scheduledReportIds.push(foreignRealmReportId);

      // `reporting_user` authenticates in the native realm, so re-owning the report to the same
      // username in a different realm must drop it from their list. Exercising the route rather
      // than the filter in isolation is the point: `list` relies on the saved objects client to
      // validate and rewrite the filter, which a unit test with a mocked client cannot cover.
      await es.update({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `scheduled_report:${foreignRealmReportId}`,
        doc: {
          scheduled_report: {
            createdById: [
              `realm:["file","default_file","${reportingAPI.REPORTING_USER_USERNAME}"]`,
            ],
          },
        },
        refresh: true,
      });

      const res = await reportingAPI.listScheduledReports(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      const returnedIds = res.data.map((r: { id: string }) => r.id);
      expect(returnedIds).not.to.contain(foreignRealmReportId);
      expect(returnedIds).to.contain(report1Id);
    });
  });
}
