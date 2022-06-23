/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useMonitorHistogram } from './use_monitor_histogram';
import * as searchHooks from '../../../../../observability/public/hooks/use_es_search';
import * as reduxHooks from 'react-redux';

describe('useMonitorHistogram', () => {
  const dynamicIndexPattern = 'synthetics-*';
  jest
    .spyOn(reduxHooks, 'useSelector')
    .mockReturnValue({ settings: { heartbeatIndices: dynamicIndexPattern } });
  const useEsSearch = jest.spyOn(searchHooks, 'useEsSearch').mockReturnValue({});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls dynamic heartbeat index', () => {
    renderHook(() => useMonitorHistogram({ items: [] }));
    expect(useEsSearch).toBeCalledWith(
      expect.objectContaining({ index: dynamicIndexPattern }),
      ['[]', 0],
      { name: 'getMonitorDownHistory' }
    );
  });
});
