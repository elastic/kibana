/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlQueryResult } from '../hooks/use_esql_query_result';

type Column = EsqlQueryResult['columns'][number];

interface ColumnExtraction {
  constants: Array<{ name: string; value: unknown }>;
  initialColumns: Column[];
}

function analyzeColumnValues(datatable: EsqlQueryResult): Array<{
  name: string;
  unique: boolean;
  constant: boolean;
  empty: boolean;
  index: number;
  column: Column;
}> {
  return datatable.columns.map((column, index) => {
    const values = new Set<unknown>();
    for (const row of datatable.rows) {
      values.add(row[index]);
    }
    return {
      name: column.name,
      unique: values.size === datatable.rows.length,
      constant: values.size === 1,
      empty: Array.from(values.values()).every((value) => !value),
      index,
      column,
    };
  });
}

export function getInitialColumnsForLogs({
  datatable,
}: {
  datatable: EsqlQueryResult;
}): ColumnExtraction {
  const analyzedColumns = analyzeColumnValues(datatable);

  const withoutUselessColumns = analyzedColumns.filter(({ column, empty, constant, unique }) => {
    return empty === false && constant === false && !(column.meta.esType === 'keyword' && unique);
  });

  const constantColumns = analyzedColumns.filter(({ constant }) => constant);

  const timestampColumnIndex = withoutUselessColumns.findIndex(
    (column) => column.name === '@timestamp'
  );

  const messageColumnIndex = withoutUselessColumns.findIndex(
    (column) => column.name === 'message' || column.name === 'msg'
  );

  const initialColumns = new Set<Column>();

  if (timestampColumnIndex !== -1) {
    initialColumns.add(withoutUselessColumns[timestampColumnIndex].column);
  }

  if (messageColumnIndex !== -1) {
    initialColumns.add(withoutUselessColumns[messageColumnIndex].column);
  }

  for (const { column } of withoutUselessColumns) {
    if (initialColumns.size <= 8) {
      initialColumns.add(column);
    } else {
      break;
    }
  }

  for (const { column } of constantColumns) {
    if (initialColumns.size <= 8) {
      initialColumns.add(column);
    } else {
      break;
    }
  }

  const constants = constantColumns.map(({ name, index, column }) => {
    return { name, value: datatable.rows[0][index] };
  });

  return {
    initialColumns: Array.from(initialColumns.values()),
    constants,
  };
}
