/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ReportApiJSON } from '@kbn/reporting-common/types';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const spacesService = getService('spaces');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('reportingAPI');

  describe('List Reports', () => {
    const spaceId = 'non_default_space';
    before(async () => {
      await spacesService.create({ id: spaceId, name: spaceId });
      await kibanaServer.importExport.load(
        `x-pack/test/functional/fixtures/kbn_archiver/reporting/ecommerce_kibana_non_default_space`,
        { space: spaceId }
      );
      await reportingAPI.initEcommerce();
      await esArchiver.load('x-pack/test/functional/es_archives/reporting/archived_reports');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/reporting/archived_reports');
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
      await spacesService.delete(spaceId);
    });

    it('should list reports filtered by current space or legacy reports with no space_id', async () => {
      const res1 = await reportingAPI.generatePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test default-space PDF 1',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        }
      );
      expect(res1.status).to.eql(200);
      const reportDefaultSpace1Id = res1.body.job.id;

      const res2 = await reportingAPI.generatePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test default-space PDF 2',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'visualization',
          version: '7.14.0',
        }
      );
      expect(res2.status).to.eql(200);
      const reportDefaultSpace2Id = res2.body.job.id;

      const res3 = await reportingAPI.generatePdf(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        {
          browserTimezone: 'UTC',
          title: 'test custom space PDF',
          layout: { id: 'preserve_layout' },
          locatorParams: [{ id: 'canvas', version: '7.14.0', params: {} }],
          objectType: 'dashboard',
          version: '7.14.0',
        },
        spaceId
      );
      expect(res3.status).to.eql(200);
      const reportNonDefaultSpace1Id = res3.body.job.id;

      const listDefault = await reportingAPI.listReports(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD
      );

      const reportsInDefaultSpace = listDefault.body;
      expect(reportsInDefaultSpace).to.have.length(4);

      const reportsInDefaultSpaceIds = reportsInDefaultSpace.map(
        (report: ReportApiJSON) => report.id
      );
      // listing should contain reports from the default space and legacy reports with no space_id
      expect(reportsInDefaultSpaceIds).to.contain(reportDefaultSpace1Id);
      expect(reportsInDefaultSpaceIds).to.contain(reportDefaultSpace2Id);
      expect(reportsInDefaultSpaceIds).to.contain('krb7arhe164k0763b50bjm31');
      expect(reportsInDefaultSpaceIds).to.contain('kraz9db6154g0763b5141viu');

      // listing should not contain reports from custom space
      expect(reportsInDefaultSpaceIds).not.to.contain(reportNonDefaultSpace1Id);

      const listNonDefault = await reportingAPI.listReports(
        reportingAPI.REPORTING_USER_USERNAME,
        reportingAPI.REPORTING_USER_PASSWORD,
        spaceId
      );

      const reportsInNonDefaultSpace = listNonDefault.body;
      expect(reportsInNonDefaultSpace).to.have.length(3);

      const reportsInNonDefaultSpaceIds = reportsInNonDefaultSpace.map(
        (report: ReportApiJSON) => report.id
      );

      // listing should contain reports from the custom space and legacy reports with no space_id
      expect(reportsInNonDefaultSpaceIds).to.contain(reportNonDefaultSpace1Id);
      expect(reportsInNonDefaultSpaceIds).to.contain('krb7arhe164k0763b50bjm31');
      expect(reportsInNonDefaultSpaceIds).to.contain('kraz9db6154g0763b5141viu');

      // listing should not contain reports from default space
      expect(reportsInNonDefaultSpaceIds).not.to.contain(reportDefaultSpace1Id);
      expect(reportsInNonDefaultSpaceIds).not.to.contain(reportDefaultSpace2Id);
    });
  });
}
