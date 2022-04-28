/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { DatatableArgs } from './datatable';
import type { ColumnConfig, ColumnConfigArg } from './datatable_column';

const TRANSPOSE_SEPARATOR = '---';

const TRANSPOSE_VISUAL_SEPARATOR = '›';

export function getTransposeId(value: string, columnId: string) {
  return `${value}${TRANSPOSE_SEPARATOR}${columnId}`;
}

export function getOriginalId(id: string) {
  if (id.includes(TRANSPOSE_SEPARATOR)) {
    const idParts = id.split(TRANSPOSE_SEPARATOR);
    return idParts[idParts.length - 1];
  }
  return id;
}

/**
 * Transposes the columns of the given table as defined in the arguments.
 * This function modifies the passed in args and firstTable objects.
 * This process consists out of three parts:
 * * Calculating the new column arguments
 * * Calculating the new datatable columns
 * * Calculating the new rows
 *
 * If the table is tranposed by multiple columns, this process is repeated on top of the previous transformation.
 *
 * @param args Arguments for the table visualization
 * @param firstTable datatable object containing the actual data
 * @param formatters Formatters for all columns to transpose columns by actual display values
 */
export function transposeTable(
  args: DatatableArgs,
  firstTable: Datatable,
  formatters: Record<string, FieldFormat>
) {
  args.columns
    .filter((columnArgs) => columnArgs.isTransposed)
    // start with the inner nested transposed column and work up to preserve column grouping
    .reverse()
    .forEach(({ columnId: transposedColumnId }) => {
      const datatableColumnIndex = firstTable.columns.findIndex((c) => c.id === transposedColumnId);
      const datatableColumn = firstTable.columns[datatableColumnIndex];
      const transposedColumnFormatter = formatters[datatableColumn.id];
      const { uniqueValues, uniqueRawValues } = getUniqueValues(
        firstTable,
        transposedColumnFormatter,
        transposedColumnId
      );
      const metricsColumnArgs = args.columns.filter((c) => c.transposable);
      const bucketsColumnArgs = args.columns.filter(
        (c) => !c.transposable && c.columnId !== transposedColumnId
      );
      firstTable.columns.splice(datatableColumnIndex, 1);

      transposeColumns(
        args,
        bucketsColumnArgs,
        metricsColumnArgs,
        firstTable,
        uniqueValues,
        uniqueRawValues,
        datatableColumn
      );
      transposeRows(
        firstTable,
        bucketsColumnArgs,
        formatters,
        transposedColumnFormatter,
        transposedColumnId,
        metricsColumnArgs
      );
    });
}

function transposeRows(
  firstTable: Datatable,
  bucketsColumnArgs: ColumnConfigArg[],
  formatters: Record<string, FieldFormat>,
  transposedColumnFormatter: FieldFormat,
  transposedColumnId: string,
  metricsColumnArgs: ColumnConfigArg[]
) {
  const rowsByBucketColumns: Record<string, DatatableRow[]> = groupRowsByBucketColumns(
    firstTable,
    bucketsColumnArgs,
    formatters
  );
  firstTable.rows = mergeRowGroups(
    rowsByBucketColumns,
    bucketsColumnArgs,
    transposedColumnFormatter,
    transposedColumnId,
    metricsColumnArgs
  );
}

/**
 * Updates column args by adding bucket column args first, then adding transposed metric columns
 * grouped by unique value
 */
function updateColumnArgs(
  args: DatatableArgs,
  bucketsColumnArgs: ColumnConfig['columns'],
  transposedColumnGroups: Array<ColumnConfig['columns']>
) {
  args.columns = [...bucketsColumnArgs];
  // add first column from each group, then add second column for each group, ...
  transposedColumnGroups[0].forEach((_, index) => {
    transposedColumnGroups.forEach((transposedColumnGroup) => {
      args.columns.push(transposedColumnGroup[index]);
    });
  });
}

/**
 * Finds all unique values in a column in order of first occurence
 * @param table Table to search through
 * @param formatter formatter for the column
 * @param columnId column
 */
function getUniqueValues(table: Datatable, formatter: FieldFormat, columnId: string) {
  const values = new Map<string, unknown>();
  table.rows.forEach((row) => {
    const rawValue = row[columnId];
    values.set(formatter.convert(row[columnId]), rawValue);
  });
  const uniqueValues = [...values.keys()];
  const uniqueRawValues = [...values.values()];
  return { uniqueValues, uniqueRawValues };
}

/**
 * Calculate transposed column objects of the datatable object and puts them into the datatable.
 * Returns args for additional columns grouped by metric
 * @param metricColumns
 * @param firstTable
 * @param uniqueValues
 */
function transposeColumns(
  args: DatatableArgs,
  bucketsColumnArgs: ColumnConfig['columns'],
  metricColumns: ColumnConfig['columns'],
  firstTable: Datatable,
  uniqueValues: string[],
  uniqueRawValues: unknown[],
  transposingDatatableColumn: DatatableColumn
) {
  const columnGroups = metricColumns.map((metricColumn) => {
    const originalDatatableColumn = firstTable.columns.find((c) => c.id === metricColumn.columnId)!;
    const datatableColumns = uniqueValues.map((uniqueValue) => {
      return {
        ...originalDatatableColumn,
        id: getTransposeId(uniqueValue, metricColumn.columnId),
        name: `${uniqueValue} ${TRANSPOSE_VISUAL_SEPARATOR} ${originalDatatableColumn.name}`,
      };
    });
    firstTable.columns.splice(
      firstTable.columns.findIndex((c) => c.id === metricColumn.columnId),
      1,
      ...datatableColumns
    );
    return uniqueValues.map((uniqueValue, valueIndex) => {
      return {
        ...metricColumn,
        columnId: getTransposeId(uniqueValue, metricColumn.columnId),
        originalColumnId: metricColumn.originalColumnId || metricColumn.columnId,
        originalName: metricColumn.originalName || originalDatatableColumn.name,
        bucketValues: [
          ...(metricColumn.bucketValues || []),
          {
            originalBucketColumn: transposingDatatableColumn,
            value: uniqueRawValues[valueIndex],
          },
        ],
      };
    });
  });
  updateColumnArgs(args, bucketsColumnArgs, columnGroups);
}

/**
 * Merge groups of rows together by creating separate columns for unique values of the column to transpose by.
 */
function mergeRowGroups(
  rowsByBucketColumns: Record<string, DatatableRow[]>,
  bucketColumns: ColumnConfigArg[],
  formatter: FieldFormat,
  transposedColumnId: string,
  metricColumns: ColumnConfigArg[]
) {
  return Object.values(rowsByBucketColumns).map((rows) => {
    const mergedRow: DatatableRow = {};
    bucketColumns.forEach((c) => {
      mergedRow[c.columnId] = rows[0][c.columnId];
    });
    rows.forEach((row) => {
      const transposalValue = formatter.convert(row[transposedColumnId]);
      metricColumns.forEach((c) => {
        mergedRow[getTransposeId(transposalValue, c.columnId)] = row[c.columnId];
      });
    });
    return mergedRow;
  });
}

/**
 * Groups rows of the data table by the values of bucket columns which are not transposed by.
 * All rows ending up in a group have the same bucket column value, but have different values of the column to transpose by.
 */
function groupRowsByBucketColumns(
  firstTable: Datatable,
  bucketColumns: ColumnConfigArg[],
  formatters: Record<string, FieldFormat>
) {
  const rowsByBucketColumns: Record<string, DatatableRow[]> = {};
  firstTable.rows.forEach((row) => {
    const key = bucketColumns.map((c) => formatters[c.columnId].convert(row[c.columnId])).join(',');
    if (!rowsByBucketColumns[key]) {
      rowsByBucketColumns[key] = [];
    }
    rowsByBucketColumns[key].push(row);
  });
  return rowsByBucketColumns;
}
