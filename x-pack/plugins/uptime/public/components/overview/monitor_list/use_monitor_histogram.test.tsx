/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { MemoryRouter } from 'react-router-dom';
import { useMonitorHistogram } from './use_monitor_histogram';
import * as searchHooks from '../../../../../observability/public/hooks/use_es_search';
import * as reduxHooks from 'react-redux';

describe('useMonitorHistogram', () => {
  const dynamicIndexPattern = 'synthetics-*';
  const useEsSearch = jest.fn().mockReturnValue({});
  jest
    .spyOn(reduxHooks, 'useSelector')
    .mockReturnValue({ settings: { heartbeatIndices: dynamicIndexPattern } });
  jest.spyOn(searchHooks as any, 'useEsSearch').mockImplementation(useEsSearch);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls dynamic heartbeat index', () => {
    renderHook(() => useMonitorHistogram({ items: [] }), {
      wrapper: MemoryRouter,
    });
    expect(useEsSearch).toBeCalledWith(
      expect.objectContaining({ index: dynamicIndexPattern }),
      ['[]', 0],
      { name: 'getMonitorDownHistory' }
    );
  });
});
