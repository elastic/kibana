/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import supertest from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

const createPdfV2Params = (testWidth: number | string, layoutId = 'preserve_layout') =>
  `(browserTimezone:UTC,layout:` +
  `(dimensions:(height:1492,width:${testWidth}),id:${layoutId}),` +
  `locatorParams:\u0021((id:DASHBOARD_APP_LOCATOR,params:` +
  `(dashboardId:\'6c263e00-1c6d-11ea-a100-8589bb9d7c6b\',` +
  `preserveSavedFilters:\u0021t,` +
  `timeRange:(from:\'2019-03-23T03:06:17.785Z\',to:\'2019-10-04T02:33:16.708Z\'),` +
  `useHash:\u0021f,` +
  `viewMode:view),` +
  `version:\'8.2.0\')),` +
  `objectType:dashboard,` +
  `title:\'Ecom Dashboard\',` +
  `version:\'8.2.0\')`;

const createPngV2Params = (testWidth: number | string) =>
  `(browserTimezone:UTC,layout:` +
  `(dimensions:(height:648,width:${testWidth}),id:preserve_layout),` +
  `locatorParams:(id:VISUALIZE_APP_LOCATOR,params:` +
  `(filters:\u0021(),` +
  `indexPattern:\'5193f870-d861-11e9-a311-0fa548c5f953\',` +
  `linked:\u0021t,` +
  `query:(language:kuery,query:\'\'),` +
  `savedSearchId:\'6091ead0-1c6d-11ea-a100-8589bb9d7c6b\',` +
  `timeRange:(from:\'2019-03-23T03:06:17.785Z\',to:\'2019-10-04T02:33:16.708Z\'),` +
  `uiState:(),` +
  `vis:(aggs:\u0021((enabled:\u0021t,id:\'1\',params:(emptyAsNull:\u0021f),schema:metric,type:count),` +
  `(enabled:\u0021t,` +
  `id:\'2\',` +
  `params:(field:customer_first_name.keyword,missingBucket:\u0021f,missingBucketLabel:Missing,order:desc,orderBy:\'1\',otherBucket:\u0021f,otherBucketLabel:Other,size:10),` +
  `schema:segment,type:terms)),` +
  `params:(maxFontSize:72,minFontSize:18,orientation:single,palette:(name:kibana_palette,type:palette),scale:linear,showLabel:\u0021t),` +
  `title:\'Tag Cloud of Names\',` +
  `type:tagcloud),` +
  `visId:\'1bba55f0-507e-11eb-9c0d-97106882b997\'),` +
  `version:\'8.2.0\'),` +
  `objectType:visualization,` +
  `title:\'Tag Cloud of Names\',` +
  `version:\'8.2.0\')`;

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const retry = getService('retry');
  const log = getService('log');
  const supertestSvc = getService('supertest');

  const status = (downloadReportPath: string, response: supertest.Response) => {
    if (response.status === 503) {
      log.debug(`Report at path ${downloadReportPath} is pending`);
    } else if (response.status === 200) {
      log.debug(`Report at path ${downloadReportPath} is complete`);
    } else {
      log.debug(`Report at path ${downloadReportPath} returned code ${response.status}`);
    }
  };

  describe('Job parameter validation', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
      await reportingAPI.deleteAllReports();
    });

    describe('printablePdfV2', () => {
      it('allows width and height to have decimal', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON(
          '/api/reporting/generate/printablePdfV2',
          { jobParams: createPdfV2Params(1541.5999755859375) }
        );
        await retry.tryForTime(60000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');
          status(downloadReportPath, response);

          expect(response.status).equal(200);
        });
      });

      it('fails if width or height are non-numeric', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON(
          '/api/reporting/generate/printablePdfV2',
          { jobParams: createPdfV2Params('cucucachoo') }
        );
        await retry.tryForTime(30000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          expect(response.status).equal(500);
        });
      });

      it('fails if there is an invalid layout ID', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON(
          '/api/reporting/generate/printablePdfV2',
          { jobParams: createPdfV2Params(1541, 'landscape') }
        );
        await retry.tryForTime(30000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          expect(response.status).equal(500);
        });
      });
    });

    describe('pngV2', () => {
      it('fails if width or height are non-numeric', async () => {
        const downloadReportPath = await reportingAPI.postJobJSON('/api/reporting/generate/pngV2', {
          jobParams: createPngV2Params('cucucachoo'),
        });
        await retry.tryForTime(30000, async () => {
          const response: supertest.Response = await supertestSvc
            .get(downloadReportPath)
            .responseType('blob')
            .set('kbn-xsrf', 'xxx');

          expect(response.status).equal(500);
        });
      });
    });
  });
}
