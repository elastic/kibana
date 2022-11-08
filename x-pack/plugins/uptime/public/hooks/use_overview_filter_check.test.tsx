/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import React from 'react';
import * as reactRedux from 'react-redux';
import { useOverviewFilterCheck } from './use_overview_filter_check';
import { MockRouter } from '../lib/helper/rtl_helpers';

function getWrapper(customSearch?: string): React.FC {
  return ({ children }) => {
    const { location, ...rest } = createMemoryHistory();
    return (
      <MockRouter
        history={{
          ...rest,
          location: {
            ...location,
            search: customSearch ? customSearch : location.search,
          },
        }}
      >
        {children}
      </MockRouter>
    );
  };
}

const SEARCH_WITH_FILTERS = '?dateRangeStart=now-30m&filters=%5B%5B"url.port"%2C%5B"5601"%5D%5D%5D';
const SEARCH_WITH_KUERY = '?search=monitor.id%20%3A%20"header-test"';

describe('useOverviewFilterCheck', () => {
  beforeEach(() => {
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(() => false);
  });

  it('returns a function that will run code when there are no filters', () => {
    const {
      result: { current },
    } = renderHook(() => useOverviewFilterCheck(), { wrapper: getWrapper() });

    const fn = jest.fn();
    current(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns a function that will not run code if there are uninitialized filters', () => {
    const {
      result: { current },
    } = renderHook(() => useOverviewFilterCheck(), {
      wrapper: getWrapper(SEARCH_WITH_FILTERS),
    });

    const fn = jest.fn();
    current(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('returns a function that will run code if filters are initialized', () => {
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(() => true);
    const {
      result: { current },
    } = renderHook(() => useOverviewFilterCheck(), {
      wrapper: getWrapper(SEARCH_WITH_FILTERS),
    });

    const fn = jest.fn();
    current(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns a function that will not run code if search is uninitialized', () => {
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(() => '');
    const {
      result: { current },
    } = renderHook(() => useOverviewFilterCheck(), {
      wrapper: getWrapper(SEARCH_WITH_KUERY),
    });

    const fn = jest.fn();
    current(fn);
    expect(fn).not.toHaveBeenCalledTimes(1);
  });

  it('returns a function that will run if search is initialized', () => {
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(() => 'search is initialized');
    const {
      result: { current },
    } = renderHook(() => useOverviewFilterCheck(), {
      wrapper: getWrapper(SEARCH_WITH_KUERY),
    });

    const fn = jest.fn();
    current(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
