/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import * as spaceHook from '../../../../../hooks/use_kibana_space';
import * as paramHook from '../../../hooks/use_url_params';
import * as redux from 'react-redux';
import { useMonitorFilters } from './use_monitor_filters';
import { WrappedHelper } from '../../../utils/testing';

describe('useMonitorFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const spaceSpy = jest.spyOn(spaceHook, 'useKibanaSpace');
  const paramSpy = jest.spyOn(paramHook, 'useGetUrlParams');
  const selSPy = jest.spyOn(redux, 'useSelector');

  it('should return an empty array when no parameters are provided', () => {
    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([]);
  });

  it('should return filters for allIds and schedules', () => {
    spaceSpy.mockReturnValue({} as any);
    paramSpy.mockReturnValue({ schedules: 'daily' } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([{ field: 'monitor.id', values: ['id1', 'id2'] }]);
  });

  it('should return filters for allIds and empty schedules', () => {
    spaceSpy.mockReturnValue({} as any);
    paramSpy.mockReturnValue({ schedules: [] } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id1', 'id2'] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([]);
  });

  it('should return filters for project IDs', () => {
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({ projects: ['project1', 'project2'] } as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([
      { field: 'monitor.project.id', values: ['project1', 'project2'] },
    ]);
  });

  it('should return filters for tags and locations', () => {
    spaceSpy.mockReturnValue({ space: null } as any);
    paramSpy.mockReturnValue({
      tags: ['tag1', 'tag2'],
      locations: ['location1', 'location2'],
    } as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([
      { field: 'tags', values: ['tag1', 'tag2'] },
      { field: 'observer.geo.name', values: ['location1', 'location2'] },
    ]);
  });

  it('should include space filters for alerts', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space1' } } as any);
    paramSpy.mockReturnValue({} as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({ forAlerts: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual([{ field: 'kibana.space_ids', values: ['space1'] }]);
  });

  it('should include space filters for non-alerts', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space2' } } as any);
    paramSpy.mockReturnValue({} as any);
    selSPy.mockReturnValue({ status: { allIds: [] } });

    const { result } = renderHook(() => useMonitorFilters({}), { wrapper: WrappedHelper });

    expect(result.current).toEqual([{ field: 'meta.space_id', values: ['space2'] }]);
  });

  it('should handle a combination of parameters', () => {
    spaceSpy.mockReturnValue({ space: { id: 'space3' } } as any);
    paramSpy.mockReturnValue({
      schedules: 'daily',
      projects: ['projectA'],
      tags: ['tagB'],
      locations: ['locationC'],
      monitorTypes: 'http',
    } as any);
    selSPy.mockReturnValue({ status: { allIds: ['id3', 'id4'] } });

    const { result } = renderHook(() => useMonitorFilters({ forAlerts: false }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual([
      { field: 'monitor.id', values: ['id3', 'id4'] },
      { field: 'monitor.project.id', values: ['projectA'] },
      { field: 'monitor.type', values: ['http'] },
      { field: 'tags', values: ['tagB'] },
      { field: 'observer.geo.name', values: ['locationC'] },
      { field: 'meta.space_id', values: ['space3'] },
    ]);
  });
});
