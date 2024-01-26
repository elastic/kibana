/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as reactRedux from 'react-redux';
import { renderHook } from '@testing-library/react-hooks';
import { WrappedHelper } from '../../../../utils/testing';

import { useLocationMonitors } from './use_location_monitors';

describe('useLocationMonitors', () => {
  let useSelectorSpy: jest.SpyInstance;
  beforeEach(() => {
    useSelectorSpy = jest.spyOn(reactRedux, 'useSelector').mockReturnValue({
      locationMonitors: [
        {
          id: 'Private location',
          count: 2,
        },
      ],
      loading: false,
    });
  });

  it('returns expected results', () => {
    useSelectorSpy.mockReturnValue({ locationMonitors: [], loading: false });
    const { result } = renderHook(() => useLocationMonitors(), { wrapper: WrappedHelper });

    expect(result.current).toStrictEqual({ locationMonitors: [], loading: false });
  });

  it('calls fetch action', () => {
    const dispatchSpy = jest.fn();
    jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(dispatchSpy);

    renderHook(() => useLocationMonitors());

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const action = dispatchSpy.mock.calls[0][0];
    expect(action.payload).toBeUndefined();
    expect(action.type).toEqual('GET LOCATION MONITORS');
  });

  it('returns expected results after data', async () => {
    const { result } = renderHook(() => useLocationMonitors(), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({
      locationMonitors: [
        {
          id: 'Private location',
          count: 2,
        },
      ],
      loading: false,
    });
  });
});
