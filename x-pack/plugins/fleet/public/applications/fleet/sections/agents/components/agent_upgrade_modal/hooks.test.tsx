/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { act } from '@testing-library/react-hooks';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { useScheduleDateTime } from './hooks';

jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
}));

describe('useScheduleDateTime', () => {
  it('do not allow to set a date before the current time', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduleDateTime('2020-01-01T10:10:00.000Z'));

    act(() => result.current.onChangeStartDateTime(moment('2020-01-01T10:10:00.000Z')));

    expect(result.current.startDatetime.toISOString()).toEqual('2020-01-01T10:10:00.000Z');
  });

  it('allow to set a date after the current time', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduleDateTime('2020-01-01T10:10:00.000Z'));

    act(() => result.current.onChangeStartDateTime(moment('2020-01-01T10:15:00.000Z')));

    expect(result.current.startDatetime.toISOString()).toEqual('2020-01-01T10:15:00.000Z');
  });

  it('should set minTime and maxTime for the same day', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduleDateTime('2020-01-01'));

    expect(result.current.minTime).toBeDefined();
    expect(result.current.maxTime).toBeDefined();
    expect(result.current.minTime?.toISOString()).toEqual('2020-01-01T05:00:00.000Z');
    expect(result.current.maxTime?.toISOString()).toEqual('2020-01-02T04:59:59.999Z');
  });

  it('should not set minTime and maxTime if the user choose a day in the future', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useScheduleDateTime('2020-01-01'));

    act(() => result.current.onChangeStartDateTime(moment('2020-01-02')));

    expect(result.current.minTime).not.toBeDefined();
    expect(result.current.maxTime).not.toBeDefined();
  });
});
