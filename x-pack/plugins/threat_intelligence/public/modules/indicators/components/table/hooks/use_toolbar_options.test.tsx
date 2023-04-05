/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';
import { renderHook } from '@testing-library/react-hooks';
import { useToolbarOptions } from '.';

describe('useToolbarOptions()', () => {
  it('should return correct value for 0 indicators total', () => {
    const result = renderHook(
      () =>
        useToolbarOptions({
          browserFields: {},
          columns: [],
          end: 0,
          start: 0,
          indicatorCount: 0,
          onResetColumns: () => {},
          onToggleColumn: () => {},
        }),
      { wrapper: TestProvidersComponent }
    );

    expect(result.result.current).toMatchSnapshot();
  });

  it('should return correct value for 25 indicators total', () => {
    const result = renderHook(
      () =>
        useToolbarOptions({
          browserFields: {},
          columns: [],
          end: 25,
          start: 0,
          indicatorCount: 25,
          onResetColumns: () => {},
          onToggleColumn: () => {},
        }),
      { wrapper: TestProvidersComponent }
    );

    expect(result.result.current).toMatchSnapshot();
  });

  it('should return correct value for 50 indicators total', () => {
    const result = renderHook(
      () =>
        useToolbarOptions({
          browserFields: {},
          columns: [],
          end: 50,
          start: 25,
          indicatorCount: 50,
          onResetColumns: () => {},
          onToggleColumn: () => {},
        }),
      { wrapper: TestProvidersComponent }
    );

    expect(result.result.current).toMatchSnapshot();
  });
});
