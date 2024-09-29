/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  upperBoundForColumnCount,
  generateColumnNames,
  columnsFromHeader,
  totalColumnCount,
} from './csv';

describe('upperBoundForColumnCount', () => {
  it('should return the correct number of columns for a simple CSV', () => {
    const samples = ['name,age,location', 'john,30,new york', 'jane,25,los angeles'];
    expect(upperBoundForColumnCount(samples)).toBe(3);
  });

  it('should handle samples with varying column counts', () => {
    const samples = ['name,age,location', 'john,30', 'jane,25,los angeles,usa'];
    expect(upperBoundForColumnCount(samples)).toBe(4);
  });

  it('should return 0 for empty samples', () => {
    const samples: string[] = [];
    expect(upperBoundForColumnCount(samples)).toBe(0);
  });

  it('should handle samples with empty strings', () => {
    const samples = ['', 'john,30,new york', 'jane,25,los angeles'];
    expect(upperBoundForColumnCount(samples)).toBe(3);
  });

  it('should handle samples with only one column', () => {
    const samples = ['name', 'john', 'jane'];
    expect(upperBoundForColumnCount(samples)).toBe(1);
  });

  it('should handle samples with extra commas', () => {
    const samples = ['name,age,location', 'john,30', 'jane,25,"los angeles,usa"'];
    expect(upperBoundForColumnCount(samples)).toBeGreaterThanOrEqual(3);
  });
});

describe('generateColumnNames', () => {
  it('should generate the correct number of column names', () => {
    const count = 5;
    const expected = ['column0', 'column1', 'column2', 'column3', 'column4'];
    expect(generateColumnNames(count)).toEqual(expected);
  });

  it('should return an empty array when count is 0', () => {
    const count = 0;
    const expected: string[] = [];
    expect(generateColumnNames(count)).toEqual(expected);
  });

  it('should handle large counts correctly', () => {
    const count = 100;
    const result = generateColumnNames(count);
    expect(result.length).toBe(count);
    expect(result[0]).toBe('column0');
    expect(result[count - 1]).toBe('column99');
  });
});

describe('columnsFromHeader', () => {
  it('should return the correct columns from the header object', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    const headerObject = { column0: 'name', column1: 'age', column2: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual(['name', 'age', 'location']);
  });

  it('should return an empty array if no columns match', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    const headerObject = { column3: 'name', column4: 'age', column5: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([]);
  });

  it('should handle missing columns in the header object', () => {
    const tempColumnNames = ['column0', 'column1', 'column2', 'column3'];
    const headerObject = { column0: 'name', column2: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([
      'name',
      undefined,
      'location',
    ]);
  });

  it('should handle an empty header object', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    const headerObject = {};
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([]);
  });

  it('should handle an empty tempColumnNames array', () => {
    const tempColumnNames: string[] = [];
    const headerObject = { column0: 'name', column1: 'age', column2: 'location' };
    expect(columnsFromHeader(tempColumnNames, headerObject)).toEqual([]);
  });
});

describe('totalColumnCount', () => {
  it('should return the correct total column count for a simple CSV', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    const csvRows = [
      { column0: 'john', column1: '30', column2: 'new york' },
      { column0: 'jane', column1: '25', column2: 'los angeles' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(3);
  });

  it('should handle rows with varying column counts', () => {
    const tempColumnNames = ['column0', 'column1', 'column2', 'column3'];
    const csvRows = [
      { column0: 'john', column1: '30' },
      { column0: 'jane', column2: 'los angeles', column3: 'usa' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(4);
  });

  it('should return 0 for empty rows', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    expect(totalColumnCount(tempColumnNames, [])).toBe(0);
  });

  it('should handle rows with empty objects', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    const csvRows = [
      {},
      { column0: 'john', column1: '30', column2: 'new york' },
      { column0: 'jane', column1: '25', column2: 'los angeles' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(3);
  });

  it('should handle rows with only one column', () => {
    const tempColumnNames = ['column0'];
    const csvRows = [{ column0: 'john' }, { column0: 'jane' }];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(1);
  });

  it('should handle rows with extra columns', () => {
    const tempColumnNames = ['column0', 'column1', 'column2'];
    const csvRows = [
      { column0: 'john', column1: '30' },
      { column0: 'jane', column1: '25', column2: 'los angeles', column3: 'usa' },
    ];
    expect(totalColumnCount(tempColumnNames, csvRows)).toBe(3);
  });
});
