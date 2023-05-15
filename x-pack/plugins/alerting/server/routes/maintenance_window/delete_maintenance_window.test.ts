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
import { deleteMaintenanceWindowRoute } from './delete_maintenance_window';
import { getMockMaintenanceWindow } from '../../maintenance_window_client/methods/test_helpers';
import { MaintenanceWindowStatus } from '../../../common';

const maintenanceWindowClient = maintenanceWindowClientMock.create();

jest.mock('../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockMaintenanceWindow = {
  ...getMockMaintenanceWindow(),
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
  status: MaintenanceWindowStatus.Running,
  id: 'test-id',
};

describe('deleteMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should delete the maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.delete.mockResolvedValueOnce(mockMaintenanceWindow);
    const [config, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: { id: 'test-id' } }
    );

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window/{id}');
    expect(config.options?.tags?.[0]).toEqual('access:write-maintenance-window');

    await handler(context, req, res);

    expect(maintenanceWindowClient.delete).toHaveBeenLastCalledWith({ id: 'test-id' });
    expect(res.noContent).toHaveBeenCalledTimes(1);
  });

  test('ensures the license allows for deleting maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.delete.mockResolvedValueOnce(mockMaintenanceWindow);
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: { id: 'test-id' } }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for deleting maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { params: { id: 'test-id' } }
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    deleteMaintenanceWindowRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });

    const [, handler] = router.delete.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
