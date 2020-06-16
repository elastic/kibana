/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getColumns } from './columns';

jest.mock('../../../../../shared_imports');

describe('Transform: Job List Columns', () => {
  test('getColumns()', () => {
    const columns = getColumns([], () => {}, []);

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
