/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Renderer, renderHook, RenderHookResult } from '@testing-library/react-hooks';
import {
  generateMockIndicator,
  generateMockUrlIndicator,
  Indicator,
} from '../../../../common/types/indicator';
import { TestProvidersComponent } from '../../../common/mocks/test_providers';
import { useFilterInOut, UseFilterInValue } from '.';
import { FilterIn } from '../utils';

describe('useFilterInOut()', () => {
  let hookResult: RenderHookResult<{}, UseFilterInValue, Renderer<unknown>>;

  it('should return empty object if Indicator is incorrect', () => {
    const indicator: Indicator = generateMockIndicator();
    indicator.fields['threat.indicator.name'] = ['wrong'];
    const field: string = 'field';
    const filterType = FilterIn;

    hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
      wrapper: TestProvidersComponent,
    });
    expect(hookResult.result.current).toEqual({});
  });

  it('should return filterFn for Indicator', () => {
    const indicator: Indicator = generateMockUrlIndicator();
    const field: string = 'threat.indicator.name';
    const filterType = FilterIn;

    hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
      wrapper: TestProvidersComponent,
    });

    expect(hookResult.result.current).toHaveProperty('filterFn');
  });

  it('should return filterFn for string', () => {
    const indicator: string = '0.0.0.0';
    const field: string = 'threat.indicator.name';
    const filterType = FilterIn;

    hookResult = renderHook(() => useFilterInOut({ indicator, field, filterType }), {
      wrapper: TestProvidersComponent,
    });

    expect(hookResult.result.current).toHaveProperty('filterFn');
  });
});
