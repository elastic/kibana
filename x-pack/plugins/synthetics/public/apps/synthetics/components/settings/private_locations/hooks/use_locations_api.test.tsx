/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { defaultCore, WrappedHelper } from '../../../../utils/testing';

import { useLocationsAPI } from './use_locations_api';

describe('useLocationsAPI', () => {
  it('returns expected results', () => {
    const { result } = renderHook(() => useLocationsAPI(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        loading: true,
        privateLocations: [],
      })
    );
    expect(defaultCore.savedObjects.client.get).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      'synthetics-privates-locations-singleton'
    );
  });
  defaultCore.savedObjects.client.get = jest.fn().mockReturnValue({
    attributes: {
      locations: [
        {
          id: 'Test',
          agentPolicyId: 'testPolicy',
        },
      ],
    },
  });
  it('returns expected results after data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        loading: true,
        privateLocations: [],
      })
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        loading: false,
        privateLocations: [
          {
            id: 'Test',
            agentPolicyId: 'testPolicy',
          },
        ],
      })
    );
  });

  it('adds location on submit', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI(), {
      wrapper: WrappedHelper,
    });

    await waitForNextUpdate();

    result.current.onSubmit({
      id: 'new',
      agentPolicyId: 'newPolicy',
      label: 'new',
      concurrentMonitors: 1,
      geo: {
        lat: 0,
        lon: 0,
      },
    });

    await waitForNextUpdate();

    expect(defaultCore.savedObjects.client.create).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      {
        locations: [
          { id: 'Test', agentPolicyId: 'testPolicy' },
          {
            concurrentMonitors: 1,
            id: 'newPolicy',
            geo: {
              lat: 0,
              lon: 0,
            },
            label: 'new',
            agentPolicyId: 'newPolicy',
          },
        ],
      },
      { id: 'synthetics-privates-locations-singleton', overwrite: true }
    );
  });

  it('deletes location on delete', async () => {
    defaultCore.savedObjects.client.get = jest.fn().mockReturnValue({
      attributes: {
        locations: [
          {
            id: 'Test',
            agentPolicyId: 'testPolicy',
          },
          {
            id: 'Test1',
            agentPolicyId: 'testPolicy1',
          },
        ],
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI(), {
      wrapper: WrappedHelper,
    });

    await waitForNextUpdate();

    result.current.onDelete('Test');

    await waitForNextUpdate();

    expect(defaultCore.savedObjects.client.create).toHaveBeenLastCalledWith(
      'synthetics-privates-locations',
      {
        locations: [
          {
            id: 'Test1',
            agentPolicyId: 'testPolicy1',
          },
        ],
      },
      { id: 'synthetics-privates-locations-singleton', overwrite: true }
    );
  });
});
