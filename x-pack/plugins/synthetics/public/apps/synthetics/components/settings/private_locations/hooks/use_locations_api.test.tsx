/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { WrappedHelper } from '../../../../utils/testing';

import { useLocationsAPI } from './use_locations_api';
import * as locationAPI from '../../../../state/private_locations/api';

describe('useLocationsAPI', () => {
  const addAPI = jest.spyOn(locationAPI, 'addSyntheticsPrivateLocations');
  const deletedAPI = jest.spyOn(locationAPI, 'deleteSyntheticsPrivateLocations');
  const getAPI = jest.spyOn(locationAPI, 'getSyntheticsPrivateLocations');

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
    expect(getAPI).toHaveBeenCalledTimes(1);
  });
  jest.spyOn(locationAPI, 'getSyntheticsPrivateLocations').mockResolvedValue({
    locations: [
      {
        id: 'Test',
        agentPolicyId: 'testPolicy',
      } as any,
    ],
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

    expect(addAPI).toHaveBeenCalledWith({
      concurrentMonitors: 1,
      id: 'newPolicy',
      geo: {
        lat: 0,
        lon: 0,
      },
      label: 'new',
      agentPolicyId: 'newPolicy',
    });
  });

  it('deletes location on delete', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI(), {
      wrapper: WrappedHelper,
    });

    await waitForNextUpdate();

    result.current.onDelete('Test');

    await waitForNextUpdate();

    expect(deletedAPI).toHaveBeenLastCalledWith('Test');
  });
});
