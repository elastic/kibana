/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginSetup } from '../../../../../../../security/server';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../../../detection_engine/routes/__mocks__';

import {
  mockGetCurrentUser,
  mockCheckTimelinesStatusBeforeInstallResult,
  mockCheckTimelinesStatusAfterInstallResult,
} from '../../../__mocks__/import_timelines';
import { installPrepackedTimelinesRequest } from '../../../__mocks__/request_responses';

import { installPrepackagedTimelines } from './helpers';
import { checkTimelinesStatus } from '../../../utils/check_timelines_status';

import { installPrepackedTimelinesRoute } from '.';

jest.mock('./helpers', () => ({
  installPrepackagedTimelines: jest.fn(),
}));

jest.mock('../../../utils/check_timelines_status', () => {
  const actual = jest.requireActual('../../../utils/check_timelines_status');
  return {
    ...actual,
    checkTimelinesStatus: jest.fn(),
  };
});

describe('installPrepackagedTimelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    installPrepackedTimelinesRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should call installPrepackagedTimelines ', async () => {
    (checkTimelinesStatus as jest.Mock).mockReturnValue(
      mockCheckTimelinesStatusBeforeInstallResult
    );

    await server.inject(
      installPrepackedTimelinesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(installPrepackagedTimelines).toHaveBeenCalled();
  });

  test('should return installPrepackagedTimelines result ', async () => {
    (checkTimelinesStatus as jest.Mock).mockReturnValue(
      mockCheckTimelinesStatusBeforeInstallResult
    );
    (installPrepackagedTimelines as jest.Mock).mockReturnValue({
      errors: [],
      success: true,
      success_count: 3,
      timelines_installed: 3,
      timelines_updated: 0,
    });

    const result = await server.inject(
      installPrepackedTimelinesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(result.body).toEqual({
      errors: [],
      success: true,
      success_count: 3,
      timelines_installed: 3,
      timelines_updated: 0,
    });
  });

  test('should not call installPrepackagedTimelines if it has nothing to install or update', async () => {
    (checkTimelinesStatus as jest.Mock).mockReturnValue(mockCheckTimelinesStatusAfterInstallResult);

    await server.inject(
      installPrepackedTimelinesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(installPrepackagedTimelines).not.toHaveBeenCalled();
  });

  test('should return success if it has nothing to install or update', async () => {
    (checkTimelinesStatus as jest.Mock).mockReturnValue(mockCheckTimelinesStatusAfterInstallResult);

    const result = await server.inject(
      installPrepackedTimelinesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(result.body).toEqual({
      errors: [],
      success: true,
      success_count: 0,
      timelines_installed: 0,
      timelines_updated: 0,
    });
  });
});
