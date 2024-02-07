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
import { bulkGetMaintenanceWindowRoute } from './bulk_get_maintenance_windows_route';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../../../common';
import { transformBulkGetResultToResponseV1 } from './transforms';

const maintenanceWindowClient = maintenanceWindowClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockMaintenanceWindow1 = {
  ...getMockMaintenanceWindow(),
  eventStartTime: new Date().toISOString(),
  eventEndTime: new Date().toISOString(),
  status: MaintenanceWindowStatus.Running,
  id: 'test-id-1',
};

const mockMaintenanceWindow2 = {
  ...getMockMaintenanceWindow(),
  eventStartTime: new Date().toISOString(),
  eventEndTime: new Date().toISOString(),
  status: MaintenanceWindowStatus.Running,
  id: 'test-id-2',
};

const mockBulkGetResponse = {
  maintenanceWindows: [mockMaintenanceWindow1, mockMaintenanceWindow2],
  errors: [
    {
      id: 'test-id-3',
      error: 'error',
      message: 'error',
      statusCode: 400,
    },
  ],
};

describe('bulkGetMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should bulk get the maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkGetMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.bulkGet.mockResolvedValueOnce(mockBulkGetResponse);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { body: { ids: ['test-id-1', 'test-id-2', 'test-id-3'] } }
    );

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window/_bulk_get');
    expect(config.options?.tags?.[0]).toEqual('access:read-maintenance-window');

    await handler(context, req, res);

    expect(maintenanceWindowClient.bulkGet).toHaveBeenLastCalledWith({
      ids: ['test-id-1', 'test-id-2', 'test-id-3'],
    });
    expect(res.ok).toHaveBeenLastCalledWith({
      body: transformBulkGetResultToResponseV1(mockBulkGetResponse),
    });
  });

  test('ensures the license allows for getting maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkGetMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.bulkGet.mockResolvedValueOnce(mockBulkGetResponse);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { body: { ids: ['test-id-1', 'test-id-2', 'test-id-3'] } }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for getting maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkGetMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      { body: { ids: ['test-id-1', 'test-id-2', 'test-id-3'] } }
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    bulkGetMaintenanceWindowRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
