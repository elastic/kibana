/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const reportingAPI = getService('reportingAPI');
  const security = getService('security');
  const log = getService('log');

  const testUserUsername = 'test_reporting_user';
  const testUserPassword = 'changeme';

  describe('Default reporting_user role', () => {
    before(async () => {
      await reportingAPI.initEcommerce();

      log.info('creating test user with reporting_user role');
      await security.user.create(testUserUsername, {
        password: testUserPassword,
        roles: ['data_analyst', 'reporting_user'], // no custom privileges to reporting, uses the built-in role that grants access to all features in all applications and all spaces
        full_name:
          'a reporting user which uses the built-in reporting_user role to access reporting features',
      });
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
    });

    it('able to generate CSV report', async () => {
      log.info('posting test report job with test user account');
      const reportPath = await reportingAPI.postJob(
        '/api/reporting/generate/csv_searchsource?jobParams=%28browserTimezone%3AAmerica%2FPhoenix%2Ccolumns%3A%21%28order_date%2Ccategory%2Ccurrency%2Ccustomer_id%2Corder_id%2Cday_of_week_i%2Cproducts.created_on%2Csku%29%2CobjectType%3Asearch%2CsearchSource%3A%28fields%3A%21%28%28field%3Aorder_date%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acategory%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acurrency%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acustomer_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aorder_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aday_of_week_i%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aproducts.created_on%2Cinclude_unmapped%3A%21t%29%2C%28field%3Asku%2Cinclude_unmapped%3A%21t%29%29%2Cfilter%3A%21%28%28meta%3A%28field%3Aorder_date%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cparams%3A%28%29%29%2Cquery%3A%28range%3A%28order_date%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272019-07-01T20%3A56%3A00.833Z%27%2Clte%3A%272019-07-02T15%3A09%3A46.563Z%27%29%29%29%29%29%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cquery%3A%28language%3Akuery%2Cquery%3A%27%27%29%2Csort%3A%21%28%28order_date%3A%28format%3Astrict_date_optional_time%2Corder%3Adesc%29%29%2C%28order_id%3Adesc%29%29%2Cversion%3A%21t%29%2Ctitle%3A%27Ecommerce%20Data%27%2Cversion%3A%279.0.0%27%29',
        testUserUsername,
        testUserPassword
      );
      log.info('test report job download path: ', reportPath);

      await reportingAPI.waitForJobToFinish(reportPath, false, testUserUsername, testUserPassword);
    });
  });
}
