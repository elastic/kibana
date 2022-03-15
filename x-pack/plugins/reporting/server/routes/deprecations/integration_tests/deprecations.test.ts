/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { setupServer } from 'src/core/server/test_utils';
import supertest from 'supertest';
import { licensingMock } from '../../../../../licensing/server/mocks';
import { securityMock } from '../../../../../security/server/mocks';
import { API_GET_ILM_POLICY_STATUS } from '../../../../common/constants';
import {
  createMockConfigSchema,
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import { registerDeprecationsRoutes } from '../deprecations';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe(`GET ${API_GET_ILM_POLICY_STATUS}`, () => {
  jest.setTimeout(6000);
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  const mockConfig = createMockConfigSchema({
    queue: { indexInterval: 'year', timeout: 10000, pollEnabled: true },
  });
  const createReportingCore = async ({
    security,
  }: {
    security?: ReturnType<typeof securityMock.createSetup>;
  }) =>
    createMockReportingCore(
      mockConfig,
      createMockPluginSetup({ security, router: httpSetup.createRouter('') }),
      await createMockPluginStart({ licensing: licensingMock.createStart() }, mockConfig)
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    ({ server, httpSetup } = await setupServer(reportingSymbol));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await server.stop();
  });

  it('correctly handles authz when security is unavailable', async () => {
    const core = await createReportingCore({});

    registerDeprecationsRoutes(core, loggingSystemMock.createLogger());
    await server.start();

    await supertest(httpSetup.server.listener)
      .get(API_GET_ILM_POLICY_STATUS)
      .expect(200)
      .then(/* Ignore result */);
  });

  it('correctly handles authz when security is disabled', async () => {
    const security = securityMock.createSetup();
    security.license.isEnabled.mockReturnValue(false);
    const core = await createReportingCore({ security });

    registerDeprecationsRoutes(core, loggingSystemMock.createLogger());
    await server.start();

    await supertest(httpSetup.server.listener)
      .get(API_GET_ILM_POLICY_STATUS)
      .expect(200)
      .then(/* Ignore result */);
  });
});
