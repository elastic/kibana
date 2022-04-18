/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { Datatable } from '@kbn/expressions-plugin';
import { computeSummaryRowForColumn, getFinalSummaryConfiguration } from './summary';

describe('Summary row helpers', () => {
  const mockNumericTable: Datatable = {
    type: 'datatable',
    columns: [{ id: 'myColumn', name: 'My Column', meta: { type: 'number' } }],
    rows: [{ myColumn: 45 }],
  };

  const mockNumericTableWithArray: Datatable = {
    type: 'datatable',
    columns: [{ id: 'myColumn', name: 'My Column', meta: { type: 'number' } }],
    rows: [{ myColumn: [45, 90] }],
  };

  const mockNonNumericTable: Datatable = {
    type: 'datatable',
    columns: [{ id: 'myColumn', name: 'My Column', meta: { type: 'string' } }],
    rows: [{ myColumn: 'myString' }],
  };

  const defaultFormatter = { convert: (x) => x } as IFieldFormat;
  const customNumericFormatter = { convert: (x: number) => x.toFixed(2) } as IFieldFormat;

  describe('getFinalSummaryConfiguration', () => {
    it('should return the base configuration for an unconfigured column', () => {
      expect(getFinalSummaryConfiguration('myColumn', {}, mockNumericTable)).toEqual({
        summaryRow: 'none',
        summaryLabel: 'None',
      });
    });

    it('should return the right configuration for a partially configured column', () => {
      expect(
        getFinalSummaryConfiguration('myColumn', { summaryRow: 'sum' }, mockNumericTable)
      ).toEqual({
        summaryRow: 'sum',
        summaryLabel: 'Sum',
      });
    });

    it('should return the base configuration for a transitioned invalid column', () => {
      expect(
        getFinalSummaryConfiguration('myColumn', { summaryRow: 'sum' }, mockNumericTableWithArray)
      ).toEqual({
        summaryRow: 'sum',
        summaryLabel: 'Sum',
      });
    });

    it('should return the base configuration for a non numeric column', () => {
      expect(
        getFinalSummaryConfiguration('myColumn', { summaryRow: 'sum' }, mockNonNumericTable)
      ).toEqual({
        summaryRow: 'none',
        summaryLabel: 'None',
      });
    });
  });

  describe('computeSummaryRowForColumn', () => {
    for (const op of ['avg', 'sum', 'min', 'max'] as const) {
      it(`should return formatted value for a ${op} summary function`, () => {
        expect(
          computeSummaryRowForColumn(
            { summaryRow: op, columnId: 'myColumn', type: 'lens_datatable_column' },
            mockNumericTable,
            {
              myColumn: customNumericFormatter,
            },
            defaultFormatter
          )
        ).toBe('45.00');
      });
    }

    it('should ignore the column formatter, rather return the raw value for count operation', () => {
      expect(
        computeSummaryRowForColumn(
          { summaryRow: 'count', columnId: 'myColumn', type: 'lens_datatable_column' },
          mockNumericTable,
          {
            myColumn: customNumericFormatter,
          },
          defaultFormatter
        )
      ).toBe(1);
    });

    it('should only count non-null/empty values', () => {
      expect(
        computeSummaryRowForColumn(
          { summaryRow: 'count', columnId: 'myColumn', type: 'lens_datatable_column' },
          { ...mockNumericTable, rows: [...mockNumericTable.rows, { myColumn: null }] },
          {
            myColumn: customNumericFormatter,
          },
          defaultFormatter
        )
      ).toBe(1);
    });

    it('should count numeric arrays as valid and distinct values', () => {
      expect(
        computeSummaryRowForColumn(
          { summaryRow: 'count', columnId: 'myColumn', type: 'lens_datatable_column' },
          mockNumericTableWithArray,
          {
            myColumn: defaultFormatter,
          },
          defaultFormatter
        )
      ).toBe(2);
    });
  });
});
