/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin';
import { DatatableArgs } from './datatable';

import { transposeTable } from './transpose_helpers';

describe('transpose_helpes', () => {
  function buildTable(): Datatable {
    // 3 buckets, 2 metrics
    // first bucket goes A/B/C
    // second buckets goes D/E/F
    // third bucket goes X/Y/Z (all combinations)
    // metric values count up from 1
    return {
      type: 'datatable',
      columns: [
        { id: 'bucket1', name: 'bucket1', meta: { type: 'string' } },
        { id: 'bucket2', name: 'bucket2', meta: { type: 'string' } },
        { id: 'bucket3', name: 'bucket3', meta: { type: 'string' } },
        { id: 'metric1', name: 'metric1', meta: { type: 'number' } },
        { id: 'metric2', name: 'metric2', meta: { type: 'number' } },
      ],
      rows: [
        { bucket1: 'A', bucket2: 'D', bucket3: 'X', metric1: 1, metric2: 2 },
        { bucket1: 'A', bucket2: 'D', bucket3: 'Y', metric1: 3, metric2: 4 },
        { bucket1: 'A', bucket2: 'D', bucket3: 'Z', metric1: 5, metric2: 6 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'X', metric1: 7, metric2: 8 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'Y', metric1: 9, metric2: 10 },
        { bucket1: 'A', bucket2: 'E', bucket3: 'Z', metric1: 11, metric2: 12 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'X', metric1: 13, metric2: 14 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'Y', metric1: 15, metric2: 16 },
        { bucket1: 'A', bucket2: 'F', bucket3: 'Z', metric1: 17, metric2: 18 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'X', metric1: 19, metric2: 20 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'Y', metric1: 21, metric2: 22 },
        { bucket1: 'B', bucket2: 'D', bucket3: 'Z', metric1: 23, metric2: 24 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'X', metric1: 25, metric2: 26 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'Y', metric1: 27, metric2: 28 },
        { bucket1: 'B', bucket2: 'E', bucket3: 'Z', metric1: 29, metric2: 30 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'X', metric1: 31, metric2: 32 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'Y', metric1: 33, metric2: 34 },
        { bucket1: 'B', bucket2: 'F', bucket3: 'Z', metric1: 35, metric2: 36 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'X', metric1: 37, metric2: 38 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'Y', metric1: 39, metric2: 40 },
        { bucket1: 'C', bucket2: 'D', bucket3: 'Z', metric1: 41, metric2: 42 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'X', metric1: 43, metric2: 44 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'Y', metric1: 45, metric2: 46 },
        { bucket1: 'C', bucket2: 'E', bucket3: 'Z', metric1: 47, metric2: 48 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'X', metric1: 49, metric2: 50 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'Y', metric1: 51, metric2: 52 },
        { bucket1: 'C', bucket2: 'F', bucket3: 'Z', metric1: 53, metric2: 54 },
      ],
    };
  }

  function buildArgs(): DatatableArgs {
    return {
      title: 'Table',
      sortingColumnId: undefined,
      sortingDirection: 'none',
      columns: [
        {
          type: 'lens_datatable_column',
          columnId: 'bucket1',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'bucket2',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'bucket3',
          isTransposed: false,
          transposable: false,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'metric1',
          isTransposed: false,
          transposable: true,
        },
        {
          type: 'lens_datatable_column',
          columnId: 'metric2',
          isTransposed: false,
          transposable: true,
        },
      ],
    };
  }

  function buildFormatters() {
    return {
      bucket1: { convert: (x: unknown) => x },
      bucket2: { convert: (x: unknown) => x },
      bucket3: { convert: (x: unknown) => x },
      metric1: { convert: (x: unknown) => x },
      metric2: { convert: (x: unknown) => x },
    } as unknown as Record<string, FieldFormat>;
  }

  it('should transpose table by one column', () => {
    const table = buildTable();
    const args = buildArgs();
    args.columns[0].isTransposed = true;
    transposeTable(args, table, buildFormatters());

    // one metric for each unique value of bucket1
    expect(table.columns.map((c) => c.id)).toEqual([
      'bucket2',
      'bucket3',
      'A---metric1',
      'B---metric1',
      'C---metric1',
      'A---metric2',
      'B---metric2',
      'C---metric2',
    ]);

    // order is different for args to visually group unique values
    const expectedColumns = [
      'bucket2',
      'bucket3',
      'A---metric1',
      'A---metric2',
      'B---metric1',
      'B---metric2',
      'C---metric1',
      'C---metric2',
    ];

    // args should be in sync
    expect(args.columns.map((c) => c.columnId)).toEqual(expectedColumns);
    // original column id should stay preserved
    expect(args.columns.slice(2).map((c) => c.originalColumnId)).toEqual([
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
    ]);

    // data should stay consistent
    expect(table.rows.length).toEqual(9);
    table.rows.forEach((row, index) => {
      expect(row['A---metric1']).toEqual(index * 2 + 1);
      expect(row['A---metric2']).toEqual(index * 2 + 2);
      // B metrics start with offset 18 because there are 18 A metrics (2 metrics * 3 bucket2 metrics * 3 bucket3 metrics)
      expect(row['B---metric1']).toEqual(18 + index * 2 + 1);
      expect(row['B---metric2']).toEqual(18 + index * 2 + 2);
      // B metrics start with offset 36 because there are 18 A metrics and 18 B metrics (2 metrics * 3 bucket2 values * 3 bucket3 values)
      expect(row['C---metric1']).toEqual(36 + index * 2 + 1);
      expect(row['C---metric2']).toEqual(36 + index * 2 + 2);
    });

    // visible name should use separator
    expect(table.columns[2].name).toEqual(`A › metric1`);
  });

  it('should transpose table by two columns', () => {
    const table = buildTable();
    const args = buildArgs();
    args.columns[0].isTransposed = true;
    args.columns[1].isTransposed = true;
    transposeTable(args, table, buildFormatters());

    // one metric for each unique value of bucket1
    expect(table.columns.map((c) => c.id)).toEqual([
      'bucket3',
      'A---D---metric1',
      'B---D---metric1',
      'C---D---metric1',
      'A---E---metric1',
      'B---E---metric1',
      'C---E---metric1',
      'A---F---metric1',
      'B---F---metric1',
      'C---F---metric1',
      'A---D---metric2',
      'B---D---metric2',
      'C---D---metric2',
      'A---E---metric2',
      'B---E---metric2',
      'C---E---metric2',
      'A---F---metric2',
      'B---F---metric2',
      'C---F---metric2',
    ]);

    // order is different for args to visually group unique values
    const expectedColumns = [
      'bucket3',
      'A---D---metric1',
      'A---D---metric2',
      'A---E---metric1',
      'A---E---metric2',
      'A---F---metric1',
      'A---F---metric2',
      'B---D---metric1',
      'B---D---metric2',
      'B---E---metric1',
      'B---E---metric2',
      'B---F---metric1',
      'B---F---metric2',
      'C---D---metric1',
      'C---D---metric2',
      'C---E---metric1',
      'C---E---metric2',
      'C---F---metric1',
      'C---F---metric2',
    ];

    // args should be in sync
    expect(args.columns.map((c) => c.columnId)).toEqual(expectedColumns);
    // original column id should stay preserved
    expect(args.columns.slice(1).map((c) => c.originalColumnId)).toEqual([
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
      'metric1',
      'metric2',
    ]);

    // data should stay consistent
    expect(table.rows.length).toEqual(3);
    table.rows.forEach((row, index) => {
      // each metric block has an additional offset of 6 because there are 6 metrics for each bucket1/bucket2 combination (2 metrics * 3 bucket3 values)
      expect(row['A---D---metric1']).toEqual(index * 2 + 1);
      expect(row['A---D---metric2']).toEqual(index * 2 + 2);
      expect(row['A---E---metric1']).toEqual(index * 2 + 6 + 1);
      expect(row['A---E---metric2']).toEqual(index * 2 + 6 + 2);
      expect(row['A---F---metric1']).toEqual(index * 2 + 12 + 1);
      expect(row['A---F---metric2']).toEqual(index * 2 + 12 + 2);

      expect(row['B---D---metric1']).toEqual(index * 2 + 18 + 1);
      expect(row['B---D---metric2']).toEqual(index * 2 + 18 + 2);
      expect(row['B---E---metric1']).toEqual(index * 2 + 24 + 1);
      expect(row['B---E---metric2']).toEqual(index * 2 + 24 + 2);
      expect(row['B---F---metric1']).toEqual(index * 2 + 30 + 1);
      expect(row['B---F---metric2']).toEqual(index * 2 + 30 + 2);

      expect(row['C---D---metric1']).toEqual(index * 2 + 36 + 1);
      expect(row['C---D---metric2']).toEqual(index * 2 + 36 + 2);
      expect(row['C---E---metric1']).toEqual(index * 2 + 42 + 1);
      expect(row['C---E---metric2']).toEqual(index * 2 + 42 + 2);
      expect(row['C---F---metric1']).toEqual(index * 2 + 48 + 1);
      expect(row['C---F---metric2']).toEqual(index * 2 + 48 + 2);
    });
  });

  it('should be able to handle missing values', () => {
    const table = buildTable();
    const args = buildArgs();
    args.columns[0].isTransposed = true;
    args.columns[1].isTransposed = true;
    // delete A-E-Z bucket
    table.rows.splice(5, 1);
    transposeTable(args, table, buildFormatters());
    expect(args.columns.length).toEqual(19);
    expect(table.columns.length).toEqual(19);
    expect(table.rows.length).toEqual(3);
    expect(table.rows[2]['A---E---metric1']).toEqual(undefined);
    expect(table.rows[2]['A---E---metric2']).toEqual(undefined);
    // 1 bucket column and 2 missing from the regular 18 columns
    expect(Object.values(table.rows[2]).filter((val) => val !== undefined).length).toEqual(
      1 + 18 - 2
    );
  });
});
