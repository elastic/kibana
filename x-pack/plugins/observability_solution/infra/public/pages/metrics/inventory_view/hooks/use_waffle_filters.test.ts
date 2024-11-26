/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { DataView } from '@kbn/data-views-plugin/common';
import { useWaffleFilters, WaffleFiltersState } from './use_waffle_filters';
import { TIMESTAMP_FIELD } from '../../../../../common/constants';
import { ResolvedDataView } from '../../../../utils/data_view';

// Mock useUrlState hook
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: '',
    replace: () => {},
  }),
}));

const mockDataView = {
  id: 'mock-id',
  timeFieldName: TIMESTAMP_FIELD,
  isPersisted: () => false,
  getName: () => 'mock-data-view',
  toSpec: () => ({}),
  getIndexPattern: () => 'mock-title',
} as jest.Mocked<DataView>;

jest.mock('../../../../containers/metrics_source', () => ({
  useMetricsDataViewContext: () => ({
    metricsView: {
      indices: 'jestbeat-*',
      timeFieldName: mockDataView.timeFieldName,
      fields: mockDataView.fields,
      dataViewReference: mockDataView,
    } as ResolvedDataView,
    loading: false,
    error: undefined,
  }),
}));

let PREFILL: Record<string, any> = {};
jest.mock('../../../../alerting/use_alert_prefill', () => ({
  useAlertPrefillContext: () => ({
    inventoryPrefill: {
      setFilterQuery(filterQuery: string) {
        PREFILL = { filterQuery };
      },
    },
  }),
}));

const renderUseWaffleFiltersHook = () => renderHook(() => useWaffleFilters());

describe('useWaffleFilters', () => {
  beforeEach(() => {
    PREFILL = {};
  });

  it('should sync the options to the inventory alert preview context', () => {
    const { result, rerender } = renderUseWaffleFiltersHook();

    const newQuery = {
      expression: 'foo',
      kind: 'kuery',
    } as WaffleFiltersState;
    act(() => {
      result.current.applyFilterQuery(newQuery);
    });
    rerender();
    expect(PREFILL.filterQuery).toEqual(newQuery.expression);
  });
});
