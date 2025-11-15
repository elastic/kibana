/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import type { ReportApiJSON } from '@kbn/reporting-common/types';
import type { JobParamsCsvV2 } from '@kbn/reporting-export-types-csv-common';
import type { CookieCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import type { FtrProviderContext } from '../../ftr_provider_context';

const API_HEADER: [string, string] = ['kbn-xsrf', 'reporting'];

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const reportingAPI = getService('svlReportingApi');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const samlAuth = getService('samlAuth');
  let cookieCredentials: CookieCredentials;
  let internalReqHeader: InternalRequestHeader;

  const archives = {
    ecommerce: {
      data: 'x-pack/platform/test/fixtures/es_archives/reporting/ecommerce',
      savedObjects: 'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/ecommerce',
    },
  };

  describe('Reporting Management', function () {
    let reportJob: ReportApiJSON;
    let path: string;

    before(async () => {
      cookieCredentials = await samlAuth.getM2MApiCookieCredentialsWithRoleScope('admin');
      internalReqHeader = samlAuth.getInternalRequestHeader();

      await esArchiver.load(archives.ecommerce.data);
      await kibanaServer.importExport.load(archives.ecommerce.savedObjects);

      // generate a report that can be deleted in the test
      const result = await reportingAPI.createReportJobInternal(
        'csv_v2',
        {
          browserTimezone: 'UTC',
          objectType: 'search',
          locatorParams: [
            {
              id: 'DISCOVER_APP_LOCATOR',
              params: {
                dataViewId: '5193f870-d861-11e9-a311-0fa548c5f953',
                sort: [['order_date', 'desc']],
                timeRange: {
                  from: '2019-06-20T23:59:44.609Z',
                  to: '2019-06-21T00:01:06.957Z',
                },
              },
              version: '9.2.0',
            },
          ],
          title: 'Ecommerce Data',
          version: '9.2.0',
        } as JobParamsCsvV2,
        cookieCredentials,
        internalReqHeader
      );

      path = result.path;
      reportJob = result.job;

      await reportingAPI.waitForJobToFinish(path, cookieCredentials, internalReqHeader);
    });

    after(async () => {
      await esArchiver.unload(archives.ecommerce.data);
      await kibanaServer.importExport.unload(archives.ecommerce.savedObjects);
    });

    it(`user can delete a report they've created`, async () => {
      const response = await supertestWithoutAuth
        .delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${reportJob.id}`)
        .set(...API_HEADER)
        .set(internalReqHeader)
        .set(cookieCredentials);

      expect(response.status).to.be(200);
      expect(response.body).to.eql({ deleted: true });
    });
  });
};
