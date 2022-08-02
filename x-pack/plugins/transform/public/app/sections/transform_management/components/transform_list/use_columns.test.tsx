/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useColumns } from './use_columns';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: Job List Columns', () => {
  test('useColumns()', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useColumns([], () => {}, 1, []));

    await waitForNextUpdate();

    const columns: ReturnType<typeof useColumns>['columns'] = result.current.columns;

    expect(columns).toHaveLength(9);
    expect(columns[0].isExpander).toBeTruthy();
    expect(columns[1].name).toBe('ID');
    expect(columns[2].id).toBe('alertRule');
    expect(columns[3].name).toBe('Description');
    expect(columns[4].name).toBe('Type');
    expect(columns[5].name).toBe('Status');
    expect(columns[6].name).toBe('Mode');
    expect(columns[7].name).toBe('Progress');
    expect(columns[8].name).toBe('Actions');
  });
});
