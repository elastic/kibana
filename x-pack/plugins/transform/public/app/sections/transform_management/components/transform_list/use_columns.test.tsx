/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useColumns } from './use_columns';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../../app/app_dependencies');

describe('Transform: Job List Columns', () => {
  test('useColumns()', () => {
    const { result } = renderHook(() => useColumns([], () => {}, []));
    const columns: ReturnType<typeof useColumns>['columns'] = result.current.columns;

    expect(columns).toHaveLength(7);
    expect(columns[0].isExpander).toBeTruthy();
    expect(columns[1].name).toBe('ID');
    expect(columns[2].name).toBe('Description');
    expect(columns[3].name).toBe('Status');
    expect(columns[4].name).toBe('Mode');
    expect(columns[5].name).toBe('Progress');
    expect(columns[6].name).toBe('Actions');
  });
});
