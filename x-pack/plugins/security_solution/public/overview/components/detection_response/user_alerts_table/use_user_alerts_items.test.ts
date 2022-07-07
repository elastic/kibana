/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import {
  mockQuery,
  mockVulnerableUsersBySeverityResult,
  parsedVulnerableUserAlertsResult,
} from './mock_data';
import { useUserAlertsItems } from './use_user_alerts_items';

import type { UseUserAlertsItems, UseUserAlertsItemsProps } from './use_user_alerts_items';

const signalIndexName = 'signal-alerts';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};
const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);
jest.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const renderUseUserAlertsItems = (overrides: Partial<UseUserAlertsItemsProps> = {}) =>
  renderHook<UseUserAlertsItemsProps, ReturnType<UseUserAlertsItems>>(() =>
    useUserAlertsItems({
      skip: false,
      signalIndexName,
      queryId: 'testing',
      ...overrides,
    })
  );

describe('useUserAlertsItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseUserAlertsItems();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 0,
      }),
    });

    expect(mockUseQueryAlerts).toBeCalledWith(mockQuery());
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockVulnerableUsersBySeverityResult,
    });

    const { result } = renderUseUserAlertsItems();

    expect(result.current).toEqual({
      items: parsedVulnerableUserAlertsResult,
      isLoading: false,
      updatedAt: dateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 1,
      }),
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow); // setUpdatedAt call
    mockDateNow.mockReturnValueOnce(dateNow); // initialization call

    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockVulnerableUsersBySeverityResult,
    });

    const { result } = renderUseUserAlertsItems();
    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedVulnerableUserAlertsResult,
      isLoading: false,
      updatedAt: newDateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 1,
      }),
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseUserAlertsItems({ skip: true });

    expect(mockUseQueryAlerts).toBeCalledWith({ ...mockQuery(), skip: true });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
      pagination: expect.objectContaining({
        currentPage: 0,
        pageCount: 0,
      }),
    });
  });
});
