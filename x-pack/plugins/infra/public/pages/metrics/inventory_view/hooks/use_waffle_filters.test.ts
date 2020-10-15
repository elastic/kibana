/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useWaffleFilters, WaffleFiltersState } from './use_waffle_filters';

// Mock useUrlState hook
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: '',
    replace: () => {},
  }),
}));

jest.mock('../../../../containers/source', () => ({
  useSourceContext: () => ({
    createDerivedIndexPattern: () => 'jestbeat-*',
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
