/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderHook } from '@testing-library/react-hooks';
import { MockRedux } from '../../../lib/helper/rtl_helpers';
import { useLocations } from './use_locations';

import * as reactRedux from 'react-redux';
import { getServiceLocations } from '../../../state/actions';

describe('useExpViewTimeRange', function () {
  const dispatch = jest.fn();
  jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(dispatch);
  it('updates lens attributes with report type from storage', async function () {
    renderHook(() => useLocations(), {
      wrapper: MockRedux,
    });

    expect(dispatch).toBeCalledWith(getServiceLocations());
  });

  it('returns loading and error from redux store', async function () {
    const error = new Error('error');
    const loading = true;
    const state = {
      monitorManagementList: {
        list: {
          perPage: 10,
          page: 1,
          total: 0,
          monitors: [],
        },
        locations: [],
        error: {
          serviceLocations: error,
          monitorList: null,
        },
        loading: {
          monitorList: false,
          serviceLocations: loading,
        },
        syntheticsService: {
          loading: false,
        },
      },
    };

    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      return <MockRedux state={state}>{children}</MockRedux>;
    };
    const { result } = renderHook(() => useLocations(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ loading, error, locations: [] });
  });
});
