/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const randomString = (length = 3) => {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
};

/**
 * Test services that are specialized for testing the default user role using
 * roles, with other specific privileges, across spaces, and sometimes sending
 * requests that are expected to fail with an authorization error.
 */
const defaultUserRoleTestServices = ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const reportingAPI = getService('reportingAPI');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');

  const DEFAULT_SPACE = 'default';
  const TEST_CUSTOM_SPACE = 'test_space_' + randomString();

  const ECOMMERCE_DATA_INDEX = 'ecommerce';
  const LOGS_DATA_INDEX = 'logstash-*';

  const DATA_READER_ROLE = 'test_data_reader_role_' + randomString();
  const SPACE_PRIVILEGES_ROLE = 'test_space_privileges_role_' + randomString();

  const UNPRIVILEGED_USER = 'test_unprivileged_reporting_user_' + randomString();
  const UNPRIVILEGED_USER_PASSWORD = 'changeme_' + randomString();

  const PRIVILEGED_REPORTING_USER = 'test_privileged_reporting_user_' + randomString();
  const PRIVILEGED_REPORTING_USER_PASSWORD = 'changeme_' + randomString();

  const archiveRoot = 'x-pack/platform/test/fixtures/es_archives';
  const ecommerceArchivePath = archiveRoot + '/reporting/ecommerce';
  const logsArchivePath = archiveRoot + '/logstash_functional';

  const soRoot = 'x-pack/platform/test/functional/fixtures/kbn_archives/reporting';
  const logsSOPath = soRoot + '/logs';
  const ecommerceSOPath = soRoot + '/ecommerce';

  /**
   * Ecommerce data: load SOs into the default space
   */
  const initEcommerce = async (spaceId = DEFAULT_SPACE) => {
    await esArchiver.load(ecommerceArchivePath, {
      performance: { batchSize: 300, concurrency: 1 },
    });
    await kibanaServer.importExport.load(ecommerceSOPath, { space: spaceId });
  };

  const teardownEcommerce = async (spaceId = DEFAULT_SPACE) => {
    await esArchiver.unload(ecommerceArchivePath);
    await kibanaServer.importExport.unload(ecommerceSOPath, { space: spaceId });
  };

  /**
   * Logs data: load into a custom space
   */
  const initLogs = async (spaceId = TEST_CUSTOM_SPACE) => {
    log.info(`initializing logs for space: ${spaceId}`);
    await esArchiver.load(logsArchivePath, {
      performance: { batchSize: 300, concurrency: 1 },
    });
    await kibanaServer.importExport.load(logsSOPath, { space: spaceId });
  };

  const teardownLogs = async (spaceId = TEST_CUSTOM_SPACE) => {
    log.info(`tearing down logs for space: ${spaceId}`);
    await esArchiver.unload(logsArchivePath);
    await kibanaServer.importExport.unload(logsSOPath, { space: spaceId });
  };

  const createTestSpace = async (spaceId = TEST_CUSTOM_SPACE) => {
    log.info(`creating test space: ${spaceId}`);
    await kibanaServer.spaces.create({
      id: spaceId,
      name: `Test Space ${spaceId}`,
    });
  };

  const createTestDataReaderRole = async (roleName = DATA_READER_ROLE) => {
    log.info(`creating test role ${roleName} to access ecommerce data`);
    await security.role.create(roleName, {
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: [ECOMMERCE_DATA_INDEX, LOGS_DATA_INDEX],
            privileges: ['read', 'view_index_metadata'],
            allow_restricted_indices: false,
          },
        ],
        run_as: [],
      },
      kibana: [], // No Kibana privileges
    });
  };

  const createSpacePrivilegesRole = async (
    roleName = SPACE_PRIVILEGES_ROLE,
    spaceId = TEST_CUSTOM_SPACE
  ) => {
    log.info(`creating ${roleName} test role to access applications in ${spaceId}`);
    await security.role.create(roleName, {
      elasticsearch: {
        cluster: [],
        indices: [], // No data access
        run_as: [],
      },
      kibana: [
        {
          base: [],
          feature: {
            discover: ['minimal_read'],
            dashboard: ['minimal_read'],
            canvas: ['minimal_read'],
            visualize: ['minimal_read'],
          },
          spaces: [spaceId],
        },
      ],
    });
  };

  const createTestUser = async (username: string, password: string, roles: string[]) => {
    log.info(
      `creating test user: ${username} with password: ${password} and roles: ${roles.join(', ')}`
    );
    await security.user.create(username, { password, roles });
  };

  const _postJob = async (spaceId: string, apiPath: string, username: string, password: string) => {
    log.info(`requesting reporting job with user: ${username} in space: ${spaceId}`);
    const job = await supertestWithoutAuth
      .post(apiPath)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx');

    if (job?.body?.path) {
      const path = job.body.path;
      log.info('test report job download path: ', path);
      await reportingAPI.waitForJobToFinish(path, false, username, password, {
        checkStatus: false,
      });
    }

    return job;
  };

  const postJobDefaultSpace = async (username: string, password: string) => {
    const apiPath = getCsvGenerationPath(DEFAULT_SPACE);
    return _postJob(DEFAULT_SPACE, apiPath, username, password);
  };

  const postJobCustomSpace = async (
    username: string,
    password: string,
    spaceId = TEST_CUSTOM_SPACE
  ) => {
    const apiPath = getCsvGenerationPath(spaceId);
    return _postJob(spaceId, apiPath, username, password);
  };

  /**
   * A successful request should generate a CSV report with 32 rows and 8 columns.
   */
  const getCsvGenerationPath = (spaceId: string) => {
    // Export Ecommerce data in the default space
    const ECOMMERCE_CSV_GENERATION_PATH_DEFAULT_SPACE =
      '/api/reporting/generate/csv_searchsource?jobParams=%28browserTimezone%3AUTC%2Ccolumns%3A%21%28order_date%2Ccategory%2Ccurrency%2Ccustomer_id%2Corder_id%2Cday_of_week_i%2Cproducts.created_on%2Csku%29%2CobjectType%3Asearch%2CsearchSource%3A%28fields%3A%21%28%28field%3Aorder_date%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acategory%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acurrency%2Cinclude_unmapped%3A%21t%29%2C%28field%3Acustomer_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aorder_id%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aday_of_week_i%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aproducts.created_on%2Cinclude_unmapped%3A%21t%29%2C%28field%3Asku%2Cinclude_unmapped%3A%21t%29%29%2Cfilter%3A%21%28%28meta%3A%28field%3Aorder_date%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cparams%3A%28%29%29%2Cquery%3A%28range%3A%28order_date%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272019-07-01T20%3A56%3A00.833Z%27%2Clte%3A%272019-07-02T15%3A09%3A46.563Z%27%29%29%29%29%29%2Cindex%3A%275193f870-d861-11e9-a311-0fa548c5f953%27%2Cquery%3A%28language%3Akuery%2Cquery%3A%27%27%29%2Csort%3A%21%28%28order_date%3A%28format%3Astrict_date_optional_time%2Corder%3Adesc%29%29%2C%28order_id%3Adesc%29%29%2Cversion%3A%21t%29%2Ctitle%3A%27Ecommerce%20Data%27%2Cversion%3A%279.0.0%27%29';

    // Export Logs data in a custom space
    const LOGS_CSV_GENERATION_PATH_CUSTOM_SPACE =
      '/s/__SPACE__/api/reporting/generate/csv_searchsource?jobParams=%28browserTimezone%3AUTC%2Ccolumns%3A%21%28%27%40timestamp%27%2C%27%40message%27%2Curl%2C%27%40tags%27%29%2CobjectType%3Asearch%2CsearchSource%3A%28fields%3A%21%28%28field%3A%27%40timestamp%27%2Cinclude_unmapped%3A%21t%29%2C%28field%3A%27%40message%27%2Cinclude_unmapped%3A%21t%29%2C%28field%3Aurl%2Cinclude_unmapped%3A%21t%29%2C%28field%3A%27%40tags%27%2Cinclude_unmapped%3A%21t%29%29%2Cfilter%3A%21%28%28meta%3A%28field%3A%27%40timestamp%27%2Cindex%3A%27logstash-%2A%27%2Cparams%3A%28%29%29%2Cquery%3A%28range%3A%28%27%40timestamp%27%3A%28format%3Astrict_date_optional_time%2Cgte%3A%272015-07-30T15%3A49%3A33.702Z%27%2Clte%3A%272015-11-01T01%3A39%3A01.782Z%27%29%29%29%29%29%2Cindex%3A%27logstash-%2A%27%2Cquery%3A%28language%3Akuery%2Cquery%3A%27host%3Amedia-for-the-masses%27%29%2Csort%3A%21%28%28%27%40timestamp%27%3A%28format%3Astrict_date_optional_time%2Corder%3Adesc%29%29%29%29%2Ctitle%3A%27A%20saved%20search%20with%20the%20time%20stored%20and%20a%20query%27%2Cversion%3A%279.2.0%27%29';

    if (spaceId === DEFAULT_SPACE) {
      return ECOMMERCE_CSV_GENERATION_PATH_DEFAULT_SPACE;
    } else {
      return LOGS_CSV_GENERATION_PATH_CUSTOM_SPACE.replace(
        /__SPACE__/g,
        encodeURIComponent(spaceId)
      );
    }
  };

  const getReportInfo = async (downloadPath: string, username: string, password: string) => {
    // change the downloadPath to the info path
    const infoPath = downloadPath.replace('/api/', '/internal/').replace('/download/', '/info/');
    log.info(`getting report info from path: ${infoPath} with user: ${username}`);
    const response = await supertestWithoutAuth
      .get(infoPath)
      .auth(username, password)
      .set('kbn-xsrf', 'xxx');
    return response.body;
  };

  return {
    DEFAULT_SPACE,
    TEST_CUSTOM_SPACE,
    ECOMMERCE_DATA_INDEX,
    LOGS_DATA_INDEX,
    DATA_READER_ROLE,
    SPACE_PRIVILEGES_ROLE,
    UNPRIVILEGED_USER,
    UNPRIVILEGED_USER_PASSWORD,
    PRIVILEGED_REPORTING_USER,
    PRIVILEGED_REPORTING_USER_PASSWORD,

    initEcommerce,
    teardownEcommerce,
    initLogs,
    teardownLogs,
    createTestSpace,
    createTestDataReaderRole,
    createSpacePrivilegesRole,
    createTestUser,

    postJobDefaultSpace,
    postJobCustomSpace,

    getCsvGenerationPath,
    getReportInfo,
  };
};

export default function (context: FtrProviderContext) {
  const security = context.getService('security');
  const kibanaServer = context.getService('kibanaServer');
  const reportingAPI = context.getService('reportingAPI');

  const api = defaultUserRoleTestServices(context); // Custom API for this test suite

  describe('Default reporting_user role', () => {
    before(async () => {
      const {
        createTestSpace,
        createTestDataReaderRole,
        createSpacePrivilegesRole,
        createTestUser,
        initEcommerce,
        initLogs,
        UNPRIVILEGED_USER,
        UNPRIVILEGED_USER_PASSWORD,
        PRIVILEGED_REPORTING_USER,
        PRIVILEGED_REPORTING_USER_PASSWORD,
        DATA_READER_ROLE,
        SPACE_PRIVILEGES_ROLE,
      } = api;

      const { REPORTING_ROLE_BUILT_IN } = reportingAPI;

      /**
       * - Create an unprivileged user account
       * - Grant the unprivileged user the built-in reporting_user role, and grant access to data. The access should NOT include access to any Kibana applications in any space
       *
       * - Create a privileged user account
       * - Grant the privileged user the built-in reporting_user role, access to data, and access to applications in the custom space ONLY.
       */
      await createTestSpace();
      await createTestDataReaderRole();
      await createSpacePrivilegesRole();

      await createTestUser(UNPRIVILEGED_USER, UNPRIVILEGED_USER_PASSWORD, [
        REPORTING_ROLE_BUILT_IN, // Gives access to reporting features using the built-in role, but no access to applications in any space
        DATA_READER_ROLE, // Gives access to the ecommerce data but no access to applications in any space
      ]);
      await createTestUser(PRIVILEGED_REPORTING_USER, PRIVILEGED_REPORTING_USER_PASSWORD, [
        REPORTING_ROLE_BUILT_IN, // Gives access to reporting features using the built-in role, but no access to applications in any space
        DATA_READER_ROLE, // Gives access to the ecommerce data but no access to applications in any space
        SPACE_PRIVILEGES_ROLE, // Grants access to applications in the custom space
      ]);

      await initEcommerce();
      await initLogs();
    });

    after(async () => {
      const {
        teardownEcommerce,
        teardownLogs,
        UNPRIVILEGED_USER,
        PRIVILEGED_REPORTING_USER,
        DATA_READER_ROLE,
        SPACE_PRIVILEGES_ROLE,
        TEST_CUSTOM_SPACE,
      } = api;

      await teardownEcommerce();
      await teardownLogs();
      await security.role.delete(DATA_READER_ROLE);
      await security.role.delete(SPACE_PRIVILEGES_ROLE);
      await security.user.delete(UNPRIVILEGED_USER);
      await security.user.delete(PRIVILEGED_REPORTING_USER);
      await kibanaServer.spaces.delete(TEST_CUSTOM_SPACE);
    });

    it('unprivileged user should not be able to generate report in default space', async () => {
      // Try to invoke a reporting job in the default space, which should FAIL with an authorization error
      const jobDefaultSpace = await api.postJobDefaultSpace(
        api.UNPRIVILEGED_USER,
        api.UNPRIVILEGED_USER_PASSWORD
      );

      // the request should succeed
      expect(jobDefaultSpace?.statusCode).to.be(200);

      // the job WILL NOT BE generated
      const result = await api.getReportInfo(
        jobDefaultSpace?.body?.path,
        api.UNPRIVILEGED_USER,
        api.UNPRIVILEGED_USER_PASSWORD
      );

      expect(result.status).to.be('failed');
      expect(result.output?.warnings).to.eql([
        'ReportingError(code: unknown_error) "Unable to bulk_get index-pattern"',
      ]);
    });

    it('privileged user is not able to generate a report in the default space', async () => {
      // Try to invoke a reporting job in the default space, which should FAIL with an authorization error
      const jobDefaultSpace = await api.postJobDefaultSpace(
        api.PRIVILEGED_REPORTING_USER,
        api.PRIVILEGED_REPORTING_USER_PASSWORD
      );

      // the request should succeed
      expect(jobDefaultSpace?.statusCode).to.be(200);

      // the job WILL NOT BE generated
      const result = await api.getReportInfo(
        jobDefaultSpace?.body?.path,
        api.PRIVILEGED_REPORTING_USER,
        api.PRIVILEGED_REPORTING_USER_PASSWORD
      );

      expect(result.status).to.be('failed');
      expect(result.output?.warnings).to.eql([
        'ReportingError(code: unknown_error) "Unable to bulk_get index-pattern"',
      ]);
    });

    it('privileged user is able to generate a report in a custom space only', async () => {
      // Try to invoke a reporting job in the custom space, which should SUCCEED
      const jobCustomSpace = await api.postJobCustomSpace(
        api.PRIVILEGED_REPORTING_USER,
        api.PRIVILEGED_REPORTING_USER_PASSWORD
      );

      // the request should succeed and the job WILL BE generated
      expect(jobCustomSpace?.statusCode).to.be(200);
      const result = await api.getReportInfo(
        jobCustomSpace?.body?.path,
        api.PRIVILEGED_REPORTING_USER,
        api.PRIVILEGED_REPORTING_USER_PASSWORD
      );

      expect(result.status).to.contain('completed'); // could be 'completed' or 'completed_with_warnings'
      expect(result.output?.error_code).to.be(undefined);
      expect(result.output).to.eql({
        content_type: 'text/csv',
        size: 5722,
        csv_contains_formulas: true,
        max_size_reached: true,
      });
    });
  });
}
