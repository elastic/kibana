/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import { maintenanceWindowClientMock } from '../../../../maintenance_window_client.mock';
import { findMaintenanceWindowsRoute } from './find_maintenance_windows_route';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../../../common';
import { rewriteMaintenanceWindowRes } from '../../../lib';

const maintenanceWindowClient = maintenanceWindowClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockMaintenanceWindows = {
  data: [
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id1',
    },
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id2',
    },
  ],
};

describe('findMaintenanceWindowsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should find the maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMaintenanceWindowsRoute(router, licenseState);

    maintenanceWindowClient.find.mockResolvedValueOnce(mockMaintenanceWindows);
    const [config, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window/_find');
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "access": "internal",
        "tags": Array [
          "access:read-maintenance-window",
        ],
      }
    `);

    await handler(context, req, res);

    expect(maintenanceWindowClient.find).toHaveBeenCalled();
    expect(res.ok).toHaveBeenLastCalledWith({
      body: {
        // @ts-expect-error upgrade typescript v5.1.6
        data: mockMaintenanceWindows.data.map((data) => rewriteMaintenanceWindowRes(data)),
        total: 2,
      },
    });
  });

  test('ensures the license allows for finding maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMaintenanceWindowsRoute(router, licenseState);

    maintenanceWindowClient.find.mockResolvedValueOnce(mockMaintenanceWindows);
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for finding maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMaintenanceWindowsRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    findMaintenanceWindowsRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.get.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
