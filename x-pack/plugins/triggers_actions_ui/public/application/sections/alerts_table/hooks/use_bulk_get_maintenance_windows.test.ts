/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { MaintenanceWindowStatus } from '@kbn/alerting-plugin/common';
import * as api from './apis/bulk_get_maintenance_windows';
import { coreMock } from '@kbn/core/public/mocks';
import type { Capabilities } from '@kbn/core/public';
import { useKibana } from '../../../../common/lib/kibana';
import { useBulkGetMaintenanceWindows } from './use_bulk_get_maintenance_windows';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { useLicense } from '../../../hooks/use_license';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../hooks/use_license');
jest.mock('./apis/bulk_get_maintenance_windows');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useLicenseMock = useLicense as jest.Mock;

const mocks = coreMock.createSetup();

const mockMaintenanceWindow = {
  id: 'test-id',
  title: 'test-title',
  duration: 60 * 60 * 1000,
  enabled: true,
  rRule: {
    tzid: 'UTC',
    dtstart: '2023-02-26T00:00:00.000Z',
    freq: 2 as const,
    count: 2,
  },
  status: MaintenanceWindowStatus.Running,
  eventStartTime: '2023-03-05T00:00:00.000Z',
  eventEndTime: '2023-03-05T01:00:00.000Z',
  events: [
    {
      gte: '2023-02-26T00:00:00.000Z',
      lte: '2023-02-26T01:00:00.000Z',
    },
    {
      gte: '2023-03-05T00:00:00.000Z',
      lte: '2023-03-05T01:00:00.000Z',
    },
  ],
  createdAt: '2023-02-26T00:00:00.000Z',
  updatedAt: '2023-02-26T00:00:00.000Z',
  createdBy: 'test-user',
  updatedBy: 'test-user',
  expirationDate: '2024-02-26T00:00:00.000Z',
};

const response = {
  maintenanceWindows: [mockMaintenanceWindow],
  errors: [],
};

let capabilities: Capabilities;

describe('useBulkGetMaintenanceWindows', () => {
  let addErrorMock: jest.Mock;
  let appMockRender: AppMockRenderer;

  beforeAll(async () => {
    const services = await mocks.getStartServices();
    capabilities = services[0].application.capabilities;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    addErrorMock = useKibana().services.notifications.toasts.addError as jest.Mock;
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      maintenanceWindow: {
        show: true,
      },
    };
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });
    appMockRender = createAppMockRenderer();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    const { waitForNextUpdate, result } = renderHook(
      () =>
        useBulkGetMaintenanceWindows({
          ids: ['test-id'],
          canFetchMaintenanceWindows: true,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitForNextUpdate();

    expect(result.current.data?.get('test-id')).toEqual(mockMaintenanceWindow);

    expect(spy).toHaveBeenCalledWith({
      http: expect.anything(),
      ids: ['test-id'],
    });
  });

  it('does not call the api if the canFetchMaintenanceWindows is false', async () => {
    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    renderHook(
      () =>
        useBulkGetMaintenanceWindows({
          ids: ['test-id'],
          canFetchMaintenanceWindows: false,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call the api if license is not platinum', async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });

    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    renderHook(
      () =>
        useBulkGetMaintenanceWindows({
          ids: ['test-id'],
          canFetchMaintenanceWindows: true,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call the api if capabilities are not adequate', async () => {
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      maintenanceWindow: {
        show: false,
      },
    };

    const spy = jest.spyOn(api, 'bulkGetMaintenanceWindows');
    spy.mockResolvedValue(response);

    renderHook(
      () =>
        useBulkGetMaintenanceWindows({
          ids: ['test-id'],
          canFetchMaintenanceWindows: true,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a toast error when the api return an error', async () => {
    const spy = jest
      .spyOn(api, 'bulkGetMaintenanceWindows')
      .mockRejectedValue(new Error('An error'));

    const { waitForNextUpdate } = renderHook(
      () =>
        useBulkGetMaintenanceWindows({
          ids: ['test-id'],
          canFetchMaintenanceWindows: true,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    await waitForNextUpdate();

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        http: expect.anything(),
        ids: ['test-id'],
      });
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
