/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { defaultCore, WrappedHelper } from '../../../../../apps/synthetics/utils/testing';
import { useLocationsAPI } from './use_locations_api';

describe('useLocationsAPI', () => {
  it('returns expected results', () => {
    const { result } = renderHook(() => useLocationsAPI({ isOpen: false }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        fetchLoading: true,
        deleteLoading: true,
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
          policyHostId: 'testPolicy',
        },
      ],
    },
  });
  it('returns expected results after data', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI({ isOpen: true }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        deleteLoading: true,
        fetchLoading: true,
        privateLocations: [],
      })
    );

    await waitForNextUpdate();

    expect(result.current).toEqual(
      expect.objectContaining({
        deleteLoading: false,
        fetchLoading: false,
        privateLocations: [
          {
            id: 'Test',
            policyHostId: 'testPolicy',
          },
        ],
      })
    );
  });

  it('adds location on submit', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI({ isOpen: true }), {
      wrapper: WrappedHelper,
    });

    await waitForNextUpdate();

    result.current.onSubmit({
      id: 'new',
      policyHostId: 'newPolicy',
      name: 'new',
      concurrentMonitors: 1,
      latLon: '',
    });

    await waitForNextUpdate();

    expect(defaultCore.savedObjects.client.create).toHaveBeenCalledWith(
      'synthetics-privates-locations',
      {
        locations: [
          { id: 'Test', policyHostId: 'testPolicy' },
          {
            concurrentMonitors: 1,
            id: 'newPolicy',
            latLon: '',
            name: 'new',
            policyHostId: 'newPolicy',
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
            policyHostId: 'testPolicy',
          },
          {
            id: 'Test1',
            policyHostId: 'testPolicy1',
          },
        ],
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useLocationsAPI({ isOpen: true }), {
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
            policyHostId: 'testPolicy1',
          },
        ],
      },
      { id: 'synthetics-privates-locations-singleton', overwrite: true }
    );
  });
});
