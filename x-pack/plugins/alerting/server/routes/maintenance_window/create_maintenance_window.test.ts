/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../lib/license_state.mock';
import { verifyApiAccess } from '../../lib/license_api_access';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { maintenanceWindowClientMock } from '../../maintenance_window_client.mock';
import { createMaintenanceWindowRoute, rewriteQueryReq } from './create_maintenance_window';
import { getMockMaintenanceWindow } from '../../maintenance_window_client/methods/test_helpers';
import { MaintenanceWindowStatus } from '../../../common';
import { rewritePartialMaintenanceBodyRes } from '../lib';

const maintenanceWindowClient = maintenanceWindowClientMock.create();

jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockMaintenanceWindow = {
  ...getMockMaintenanceWindow(),
  eventStartTime: new Date().toISOString(),
  eventEndTime: new Date().toISOString(),
  status: MaintenanceWindowStatus.Running,
  id: 'test-id',
};

const createParams = {
  title: 'test-title',
  duration: 1000,
  r_rule: mockMaintenanceWindow.rRule,
};

describe('createMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should create the maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.create.mockResolvedValueOnce(mockMaintenanceWindow);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { body: createParams }
    );

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window');
    expect(config.options?.tags?.[0]).toEqual('access:write-maintenance-window');

    await handler(context, req, res);

    expect(maintenanceWindowClient.create).toHaveBeenLastCalledWith(rewriteQueryReq(createParams));
    expect(res.ok).toHaveBeenLastCalledWith({
      body: rewritePartialMaintenanceBodyRes(mockMaintenanceWindow),
    });
  });

  test('ensures the license allows for creating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.create.mockResolvedValueOnce(mockMaintenanceWindow);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { body: createParams }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for creating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { body: createParams }
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    createMaintenanceWindowRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });

    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
