/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../common/lib/kibana';
import { useMatrixHistogram } from '.';
import { MatrixHistogramType } from '../../../../common/search_strategy';

jest.mock('../../../common/lib/kibana');

describe('useMatrixHistogram', () => {
  const props = {
    endDate: new Date(Date.now()).toISOString(),
    errorMessage: '',
    filterQuery: {},
    histogramType: MatrixHistogramType.events,
    indexNames: [],
    stackByField: 'event.module',
    startDate: new Date(Date.now()).toISOString(),
  };

  it('should update request when props has changed', async () => {
    const localProps = { ...props };
    const { rerender } = renderHook(() => useMatrixHistogram(localProps));

    localProps.stackByField = 'event.action';

    rerender();

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;
    expect(mockCalls.length).toBe(2);
    expect(mockCalls[0][0].stackByField).toBe('event.module');
    expect(mockCalls[1][0].stackByField).toBe('event.action');
  });

  it('returns a memoized value', async () => {
    const { result, rerender } = renderHook(() => useMatrixHistogram(props));

    const result1 = result.current[1];
    act(() => rerender());
    const result2 = result.current[1];

    expect(result1).toBe(result2);
  });
});
