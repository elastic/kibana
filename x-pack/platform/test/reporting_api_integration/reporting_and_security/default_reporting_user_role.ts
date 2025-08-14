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
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  describe('Default reporting_user role', () => {
    before(async () => {
      await reportingAPI.initEcommerce();
    });

    after(async () => {
      await reportingAPI.teardownEcommerce();
    });

    describe('Minimum spaces privileges', () => {
      /*
       * 1. Set up two custom spaces
       * 2. Create a user with the built-in reporting_user role, as their only role
       * 3. Try to invoke a reporting job in the default space, which should fail with an authorization error
       * 4. Grant an additional role which grants access one of the custom spaces
       * 5. Try to invoke a reporting job in the granted custom space, which should succeed
       * 6. Try to invoke a reporting job in the other custom space, which should fail with an authorization error
       */
      const createCustomSpace = async (spaceId: string) => {
        log.info(`creating custom space with id: ${spaceId}`);
        await kibanaServer.spaces.create({
          id: spaceId,
          name: `Custom Space ${spaceId}`,
        });
      };

      const createSpacesReportingUser = async (username: string, password: string) => {
        log.info('creating test user with built-in reporting_user role');
        await security.user.create(username, {
          password,
          roles: ['reporting_user'], // gives access to reporting using the built-in role, but not access to data or kibana applications in any space
          full_name:
            'a reporting user which uses the built-in reporting_user role to access reporting features',
        });
      };

      const postJob = async (
        apiPath: string,
        username: string,
        password: string,
        returnCode: number
      ) => {
        const { body } = await supertestWithoutAuth
          .post(apiPath)
          .auth(username, password)
          .set('kbn-xsrf', 'xxx')
          .expect(returnCode);

        return body;
      };

      const testSpacesReportingUserName = 'test_spaces_reporting_user';
      const testSpacesReportingUserPassword = 'changeme';
      const customSpace1 = 'custom_space_1';
      const customSpace2 = 'custom_space_2';

      before(async () => {
        await createCustomSpace(customSpace1);
        await createCustomSpace(customSpace2);
        await createSpacesReportingUser(
          testSpacesReportingUserName,
          testSpacesReportingUserPassword
        );
      });

      it('should not be able to generate report in default space', async () => {
        const job = await postJob(
          '/api/reporting/generate/csv_searchsource?jobParams=%28browserTimezone%3AAmerica%2FPhoenix%2Ccolumns%3A%21%28order_date%2Ccategory%2Ccurrency%2Ccustomer_id%2Corder_id%2Cday_of_week_i%2Cproducts.created_on%2Csku%29%2CobjectType%3Asearch%2CsearchSource%3A%28fields%3A%21%28%28field%3Aorder_date%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acategory%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acurrency%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acustomer_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aorder_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aday_of_week_i%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aproducts.created_on%2Cinclude_unmapped%3A%21t%29%2C%28field%3Asku%2Cinclude_unmapped%3A%21t%29%29%2Cfilter%3A%21%28%28meta%3A%28field%3Aorder_date%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cparams%3A%28%29%29%2Cquery%3A%28range%3A%28order_date%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272019-07-01T20%3A56%3A00.833Z%27%2Clte%3A%272019-07-02T15%3A09%3A46.563Z%27%29%29%29%29%29%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cquery%3A%28language%3Akuery%2Cquery%3A%27%27%29%2Csort%3A%21%28%28order_date%3A%28format%3Astrict_date_optional_time%2Corder%3Adesc%29%29%2C%28order_id%3Adesc%29%29%2Cversion%3A%21t%29%2Ctitle%3A%27Ecommerce%20Data%27%2Cversion%3A%279.0.0%27%29',
          testSpacesReportingUserName,
          testSpacesReportingUserPassword,
          403 // expect forbidden error
        );

        if (job && job.path) {
          log.info('test report job download path: ', job.path);
          await reportingAPI.waitForJobToFinish(
            job.path,
            false,
            testSpacesReportingUserName,
            testSpacesReportingUserPassword
          );
        }

        /*
         * WIP
         */
      });

      after(async () => {
        await security.user.delete(testSpacesReportingUserName);
        await kibanaServer.spaces.delete(customSpace1);
        await kibanaServer.spaces.delete(customSpace2);
      });
    });

    describe('Report generation', () => {
      const testUserUsername = 'test_reporting_user';
      const testUserPassword = 'changeme';

      before(async () => {
        log.info('creating test user with roles: data_analyst and reporting_user');
        await security.user.create(testUserUsername, {
          password: testUserPassword,
          roles: ['data_analyst', 'reporting_user'], // gives access to reporting using the built-in role and access to data in the default space
          full_name:
            'a reporting user which uses the built-in reporting_user role to access reporting features',
        });
      });

      after(async () => {
        await security.user.delete(testUserUsername);
      });

      it('able to generate CSV report', async () => {
        log.info('posting test report job with test user account');
        const reportPath = await reportingAPI.postJob(
          '/api/reporting/generate/csv_searchsource?jobParams=%28browserTimezone%3AAmerica%2FPhoenix%2Ccolumns%3A%21%28order_date%2Ccategory%2Ccurrency%2Ccustomer_id%2Corder_id%2Cday_of_week_i%2Cproducts.created_on%2Csku%29%2CobjectType%3Asearch%2CsearchSource%3A%28fields%3A%21%28%28field%3Aorder_date%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acategory%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acurrency%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acustomer_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aorder_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aday_of_week_i%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aproducts.created_on%2Cinclude_unmapped%3A%21t%29%2C%28field%3Asku%2Cinclude_unmapped%3A%21t%29%29%2Cfilter%3A%21%28%28meta%3A%28field%3Aorder_date%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cparams%3A%28%29%29%2Cquery%3A%28range%3A%28order_date%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272019-07-01T20%3A56%3A00.833Z%27%2Clte%3A%272019-07-02T15%3A09%3A46.563Z%27%29%29%29%29%29%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cquery%3A%28language%3Akuery%2Cquery%3A%27%27%29%2Csort%3A%21%28%28order_date%3A%28format%3Astrict_date_optional_time%2Corder%3Adesc%29%29%2C%28order_id%3Adesc%29%29%2Cversion%3A%21t%29%2Ctitle%3A%27Ecommerce%20Data%27%2Cversion%3A%279.0.0%27%29',
          testUserUsername,
          testUserPassword
        );
        log.info('test report job download path: ', reportPath);

        await reportingAPI.waitForJobToFinish(
          reportPath,
          false,
          testUserUsername,
          testUserPassword
        );
      });
    });
  });
}
