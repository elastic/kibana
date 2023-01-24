/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import * as redux from 'react-redux';
import { MONITOR_ROUTE } from '../../../../../../common/constants';
import { mockState } from '../../../utils/testing/__mocks__/synthetics_store.mock';
import { WrappedHelper } from '../../../utils/testing';
import { SyntheticsAppState } from '../../../state/root_reducer';
import {
  selectEncryptedSyntheticsSavedMonitors,
  fetchMonitorListAction,
  MonitorListPageState,
} from '../../../state';

import { useMonitorList } from './use_monitor_list';

describe('useMonitorList', () => {
  let state: SyntheticsAppState;
  let initialState: Omit<ReturnType<typeof useMonitorList>, 'loadPage' | 'reloadPage'>;
  let defaultPageState: MonitorListPageState;
  const dispatchMockFn = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(redux, 'useDispatch').mockReturnValue(dispatchMockFn);

    state = mockState;
    initialState = {
      loading: false,
      loaded: false,
      total: state.monitorList.data.total ?? 0,
      error: state.monitorList.error,
      absoluteTotal: state.monitorList.data.absoluteTotal ?? 0,
      pageState: state.monitorList.pageState,
      isDataQueried: false,
      syntheticsMonitors: selectEncryptedSyntheticsSavedMonitors.resultFunc(state.monitorList),
    };

    defaultPageState = {
      ...state.monitorList.pageState,
      query: '',
      locations: [],
      monitorTypes: [],
      tags: [],
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns expected initial state', () => {
    const {
      result: { current: hookResult },
    } = renderHook(() => useMonitorList(), { wrapper: WrappedHelper });

    expect(hookResult).toMatchObject(initialState);
  });

  it('dispatches correct action for query url param', async () => {
    const query = 'xyz';
    const url = `/monitor/1?query=${query}`;

    jest.useFakeTimers().setSystemTime(Date.now());
    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper url={url} path={MONITOR_ROUTE}>
          {children}
        </WrappedHelper>
      );
    };

    renderHook(() => useMonitorList(), { wrapper: WrapperWithState });

    expect(dispatchMockFn).toHaveBeenCalledWith(
      fetchMonitorListAction.get({ ...defaultPageState, query })
    );
  });

  it('dispatches correct action for filter url param', async () => {
    const tags = ['abc', 'xyz'];
    const locations = ['loc1', 'loc1'];
    const monitorTypes = ['browser'];

    const url = `/monitor/1?tags=${JSON.stringify(tags)}&locations=${JSON.stringify(
      locations
    )}&monitorTypes=${JSON.stringify(monitorTypes)}`;

    jest.useFakeTimers().setSystemTime(Date.now());
    const WrapperWithState = ({ children }: { children: React.ReactElement }) => {
      return (
        <WrappedHelper url={url} path={MONITOR_ROUTE}>
          {children}
        </WrappedHelper>
      );
    };

    renderHook(() => useMonitorList(), { wrapper: WrapperWithState });

    expect(dispatchMockFn).toHaveBeenCalledWith(
      fetchMonitorListAction.get({ ...defaultPageState, tags, locations, monitorTypes })
    );
  });
});
