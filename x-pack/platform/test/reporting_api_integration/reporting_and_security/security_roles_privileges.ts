/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { SerializedConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const supertest = getService('supertest');

  function testExpectedTask(
    id: string,
    jobtype: string,
    task: SearchHit<{ task: SerializedConcreteTaskInstance }>
  ) {
    expect(task._source?.task.taskType).to.eql('report:execute-scheduled');

    const params = JSON.parse(task._source?.task.params ?? '');
    expect(params.id).to.eql(id);
    expect(params.jobtype).to.eql(jobtype);

    expect(task._source?.task.apiKey).not.to.be(undefined);
    expect(task._source?.task.schedule?.rrule).not.to.be(undefined);

    expect(task._source?.task.schedule?.interval).to.be(undefined);
  }
  describe('Security Roles and Privileges for Applications', () => {
    const scheduledReportIds: string[] = [];
    const scheduledReportTaskIds: string[] = [];
    before(async () => {
      await reportingAPI.initEcommerce();
    });
    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await reportingAPI.deleteScheduledReports(scheduledReportIds);
      await reportingAPI.deleteTasks(scheduledReportTaskIds);
    });

    describe('Dashboard: Generate PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'dashboard',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
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
        expect(res.status).to.eql(200);
      });
    });

    describe('Visualize: Generate PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'visualization',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'visualization',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Canvas: Generate PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'canvas',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generatePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'canvas',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);
      });
    });

    describe('Discover: Generate CSV report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.generateCsv(
          {
            browserTimezone: 'UTC',
            searchSource: {} as SerializedSearchSourceFields,
            objectType: 'search',
            title: 'test disallowed',
            version: '7.14.0',
          },
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.generateCsv(
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
        expect(res.status).to.eql(200);
      });
    });

    describe('Dashboard: Schedule PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.schedulePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'dashboard',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.schedulePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'dashboard',
            version: '7.14.0',
          },
          { rrule: { freq: 1, interval: 1, tzid: 'UTC' } },
          '2025-06-01T13:00:00.000Z'
        );
        expect(res.status).to.eql(200);

        const soResult = await reportingAPI.getScheduledReports(res.body.job.id);
        expect(soResult.status).to.eql(200);
        expect(soResult.body._source.scheduled_report.title).to.eql('test PDF allowed');
        expect(soResult.body._source.scheduled_report.createdBy).to.eql('reporting_user');
        expect(soResult.body._source.scheduled_report.enabled).to.eql(true);
        expect(soResult.body._source.scheduled_report.jobType).to.eql('printable_pdf_v2');
        expect(soResult.body._source.scheduled_report.meta).to.eql({
          isDeprecated: false,
          layout: 'preserve_layout',
          objectType: 'dashboard',
        });
        expect(soResult.body._source.scheduled_report.payload).to.eql(
          '{"browserTimezone":"UTC","layout":{"id":"preserve_layout"},"objectType":"dashboard","title":"test PDF allowed","version":"7.14.0","locatorParams":[{"id":"canvas","params":{},"version":"7.14.0"}],"isDeprecated":false}'
        );
        expect(soResult.body._source.scheduled_report.schedule).to.eql({
          rrule: {
            dtstart: '2025-06-01T13:00:00.000Z',
            freq: 1,
            interval: 1,
            tzid: 'UTC',
          },
        });
        scheduledReportIds.push(res.body.job.id);

        const taskResult = await reportingAPI.getTask(res.body.job.id);
        expect(taskResult.status).to.eql(200);
        testExpectedTask(res.body.job.id, 'printable_pdf_v2', taskResult.body);
        scheduledReportTaskIds.push(res.body.job.id);
      });
    });

    describe('Visualize: Schedule PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.schedulePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'visualization',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.schedulePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'visualization',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);

        const soResult = await reportingAPI.getScheduledReports(res.body.job.id);
        expect(soResult.status).to.eql(200);
        expect(soResult.body._source.scheduled_report.title).to.eql('test PDF allowed');
        expect(soResult.body._source.scheduled_report.createdBy).to.eql('reporting_user');
        expect(soResult.body._source.scheduled_report.enabled).to.eql(true);
        expect(soResult.body._source.scheduled_report.jobType).to.eql('printable_pdf_v2');
        expect(soResult.body._source.scheduled_report.meta).to.eql({
          isDeprecated: false,
          layout: 'preserve_layout',
          objectType: 'visualization',
        });
        expect(soResult.body._source.scheduled_report.payload).to.eql(
          '{"browserTimezone":"UTC","layout":{"id":"preserve_layout"},"objectType":"visualization","title":"test PDF allowed","version":"7.14.0","locatorParams":[{"id":"canvas","params":{},"version":"7.14.0"}],"isDeprecated":false}'
        );
        expect(soResult.body._source.scheduled_report.schedule).to.eql({
          rrule: {
            freq: 1,
            interval: 1,
            tzid: 'UTC',
          },
        });
        scheduledReportIds.push(res.body.job.id);

        const taskResult = await reportingAPI.getTask(res.body.job.id);
        expect(taskResult.status).to.eql(200);
        testExpectedTask(res.body.job.id, 'printable_pdf_v2', taskResult.body);
        scheduledReportTaskIds.push(res.body.job.id);
      });
    });

    describe('Canvas: Schedule PDF report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.schedulePdf(
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF disallowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'canvas',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.schedulePdf(
          reportingAPI.REPORTING_USER_USERNAME,
          reportingAPI.REPORTING_USER_PASSWORD,
          {
            browserTimezone: 'UTC',
            title: 'test PDF allowed',
            layout: { id: 'preserve_layout' },
            locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
            objectType: 'canvas',
            version: '7.14.0',
          }
        );
        expect(res.status).to.eql(200);

        const soResult = await reportingAPI.getScheduledReports(res.body.job.id);
        expect(soResult.status).to.eql(200);
        expect(soResult.body._source.scheduled_report.title).to.eql('test PDF allowed');
        scheduledReportIds.push(res.body.job.id);

        const taskResult = await reportingAPI.getTask(res.body.job.id);
        expect(taskResult.status).to.eql(200);
        testExpectedTask(res.body.job.id, 'printable_pdf_v2', taskResult.body);
        scheduledReportTaskIds.push(res.body.job.id);
      });
    });

    describe('Discover: Schedule CSV report', () => {
      it('does not allow user that does not have the role-based privilege', async () => {
        const res = await reportingAPI.scheduleCsv(
          {
            browserTimezone: 'UTC',
            searchSource: {} as SerializedSearchSourceFields,
            objectType: 'search',
            title: 'test disallowed',
            version: '7.14.0',
          },
          reportingAPI.DATA_ANALYST_USERNAME,
          reportingAPI.DATA_ANALYST_PASSWORD
        );
        expect(res.status).to.eql(403);
      });

      it('does allow user with the role-based privilege', async () => {
        const res = await reportingAPI.scheduleCsv(
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
        expect(res.status).to.eql(200);

        const soResult = await reportingAPI.getScheduledReports(res.body.job.id);
        expect(soResult.status).to.eql(200);
        expect(soResult.body._source.scheduled_report.title).to.eql('allowed search');
        scheduledReportIds.push(res.body.job.id);

        const taskResult = await reportingAPI.getTask(res.body.job.id);
        expect(taskResult.status).to.eql(200);
        testExpectedTask(res.body.job.id, 'csv_searchsource', taskResult.body);
        scheduledReportTaskIds.push(res.body.job.id);
      });
    });

    // This tests the same API as x-pack/test/api_integration/apis/security/privileges.ts, but it uses the non-deprecated config
    it('should register reporting privileges with the security privileges API', async () => {
      await supertest
        .get('/api/security/privileges')
        .set('kbn-xsrf', 'xxx')
        .send()
        .expect(200)
        .expect((res) => {
          expect(res.body.features.canvas).match(/generate_report/);
          expect(res.body.features.dashboard).match(/download_csv_report/);
          expect(res.body.features.dashboard).match(/generate_report/);
          expect(res.body.features.discover).match(/generate_report/);
          expect(res.body.features.visualize).match(/generate_report/);
        });
    });
  });
}
