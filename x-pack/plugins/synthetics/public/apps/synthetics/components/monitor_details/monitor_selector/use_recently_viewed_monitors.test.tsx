/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useRecentlyViewedMonitors } from './use_recently_viewed_monitors';
import { mockCore, WrappedHelper } from '../../../utils/testing';
import { syntheticsMonitorType } from '../../../../../../common/types/saved_objects';
import { MONITOR_ROUTE } from '../../../../../../common/constants';

const resultData = {
  resolved_objects: [
    {
      saved_object: {
        id: 'c9322230-2a11-11ed-962b-d3e7eeedf9d1',

        attributes: {
          name: 'Test Monitor',
          locations: [],
        },
      },
    },
  ],
};

describe('useRecentlyViewedMonitors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns expected result', () => {
    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper url="/monitor/1" path={MONITOR_ROUTE}>
          {children}
        </WrappedHelper>
      );
    };

    const { result } = renderHook(() => useRecentlyViewedMonitors(), { wrapper: WrapperWithState });
    expect(result.current).toEqual([]);
  });

  it('returns the result when found', async () => {
    const core = mockCore();

    core.savedObjects!.client.bulkResolve = jest.fn().mockResolvedValue(resultData);

    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper core={core} url="/monitor/1" path={MONITOR_ROUTE}>
          {children}
        </WrappedHelper>
      );
    };

    const { result, waitForNextUpdate } = renderHook(() => useRecentlyViewedMonitors(), {
      wrapper: WrapperWithState,
    });
    expect(result.current).toEqual([]);

    expect(core.savedObjects?.client.bulkResolve).toHaveBeenCalledTimes(1);
    expect(core.savedObjects?.client.bulkResolve).toHaveBeenLastCalledWith([
      { id: '1', type: syntheticsMonitorType },
    ]);

    await waitForNextUpdate();

    await waitFor(() => {
      expect(result.current).toEqual([
        {
          isGroupLabel: true,
          key: 'recently_viewed',
          label: 'Recently viewed',
        },
        {
          key: 'c9322230-2a11-11ed-962b-d3e7eeedf9d1',
          label: 'Test Monitor',
          locationIds: [],
        },
      ]);
    });
  });
});
