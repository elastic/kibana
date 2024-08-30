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
import { updateMaintenanceWindowRoute } from './update_maintenance_window_route';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../../../common';
import { transformUpdateBody } from './transforms';
import { rewritePartialMaintenanceBodyRes } from '../../../lib';
import { UpdateMaintenanceWindowRequestBody } from '../../../schemas/maintenance_window/apis/update';

const maintenanceWindowClient = maintenanceWindowClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

const mockMaintenanceWindow = {
  ...getMockMaintenanceWindow(),
  eventStartTime: new Date().toISOString(),
  eventEndTime: new Date().toISOString(),
  status: MaintenanceWindowStatus.Running,
  id: 'test-id',
};

const updateParams: UpdateMaintenanceWindowRequestBody = {
  title: 'new-title',
  duration: 5000,
  enabled: false,
  r_rule: {
    tzid: 'CET',
    dtstart: '2023-03-26T00:00:00.000Z',
    freq: 2 as const,
    count: 10,
  },
  category_ids: ['observability'],
};

describe('updateMaintenanceWindowRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should update the maintenance window', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(mockMaintenanceWindow);
    const [config, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams,
      }
    );

    expect(config.path).toEqual('/internal/alerting/rules/maintenance_window/{id}');
    expect(config.options?.tags?.[0]).toEqual('access:write-maintenance-window');

    await handler(context, req, res);

    expect(maintenanceWindowClient.update).toHaveBeenLastCalledWith({
      id: 'test-id',
      data: transformUpdateBody(updateParams),
    });

    expect(res.ok).toHaveBeenLastCalledWith({
      // @ts-expect-error upgrade typescript v5.1.6
      body: rewritePartialMaintenanceBodyRes(mockMaintenanceWindow),
    });
  });

  test('ensures the license allows for updating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    maintenanceWindowClient.update.mockResolvedValueOnce(mockMaintenanceWindow);
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams,
      }
    );
    await handler(context, req, res);
    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  test('ensures the license check prevents for updating maintenance windows', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments(
      { maintenanceWindowClient },
      {
        params: { id: 'test-id' },
        body: updateParams,
      }
    );
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });

  test('ensures only platinum license can access API', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateMaintenanceWindowRoute(router, licenseState);

    (licenseState.ensureLicenseForMaintenanceWindow as jest.Mock).mockImplementation(() => {
      throw new Error('Failure');
    });
    const [, handler] = router.post.mock.calls[0];
    const [context, req, res] = mockHandlerArguments({ maintenanceWindowClient }, { body: {} });
    await expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: Failure]`);
  });
});
