/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { WrappedHelper } from '../../../../utils/testing';
import { getServiceLocations } from '../../../../state/service_locations';
import { setAddingNewPrivateLocation } from '../../../../state/private_locations';
import { useLocationsAPI } from './use_locations_api';
import * as locationAPI from '../../../../state/private_locations/api';
import * as reduxHooks from 'react-redux';

describe('useLocationsAPI', () => {
  const dispatch = jest.fn();
  const addAPI = jest.spyOn(locationAPI, 'addSyntheticsPrivateLocations').mockResolvedValue({
    locations: [],
  });
  const deletedAPI = jest.spyOn(locationAPI, 'deleteSyntheticsPrivateLocations').mockResolvedValue({
    locations: [],
  });
  const getAPI = jest.spyOn(locationAPI, 'getSyntheticsPrivateLocations');
  jest.spyOn(reduxHooks, 'useDispatch').mockReturnValue(dispatch);

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

    act(() => {
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
    expect(dispatch).toBeCalledWith(setAddingNewPrivateLocation(false));
    expect(dispatch).toBeCalledWith(getServiceLocations());
  });

  it('deletes location on delete', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI(), {
      wrapper: WrappedHelper,
    });

    await waitForNextUpdate();

    act(() => {
      result.current.onDelete('Test');
    });

    await waitForNextUpdate();

    expect(deletedAPI).toHaveBeenLastCalledWith('Test');
    expect(dispatch).toBeCalledWith(setAddingNewPrivateLocation(false));
    expect(dispatch).toBeCalledWith(getServiceLocations());
  });
});
