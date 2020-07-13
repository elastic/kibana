/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecurityPluginSetup } from '../../../../../../plugins/security/server';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../detection_engine/routes/__mocks__';

import {
  mockGetCurrentUser,
  mockCheckTimelinesStatusBeforeInstallResult,
  mockCheckTimelinesStatusAfterInstallResult,
} from './__mocks__/import_timelines';
import { installPrepackedTimelinesRequest } from './__mocks__/request_responses';

import { installPrepackagedTimelines } from './utils/install_prepacked_timelines';
import { checkTimelinesStatus } from './utils/check_timelines_status';

import { installPrepackedTimelinesRoute } from './install_prepacked_timelines_route';

jest.mock('./utils/install_prepacked_timelines', () => ({
  installPrepackagedTimelines: jest.fn(),
}));

jest.mock('./utils/check_timelines_status', () => ({
  checkTimelinesStatus: jest.fn(),
}));

describe('installPrepackagedTimelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = ({
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown) as SecurityPluginSetup;

    installPrepackedTimelinesRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should call installPrepackagedTimelines ', async () => {
    (checkTimelinesStatus as jest.Mock).mockReturnValue(
      mockCheckTimelinesStatusBeforeInstallResult
    );

    await server.inject(installPrepackedTimelinesRequest(), context);

    expect(installPrepackagedTimelines).toHaveBeenCalled();
  });

  test('should not call installPrepackagedTimelines if it has nothing to install or update', async () => {
    (checkTimelinesStatus as jest.Mock).mockReturnValue(mockCheckTimelinesStatusAfterInstallResult);

    await server.inject(installPrepackedTimelinesRequest(), context);

    expect(installPrepackagedTimelines).not.toHaveBeenCalled();
  });
});
