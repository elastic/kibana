/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { EntityDefinition } from '../../common/entities';

type Column = ESQLSearchResponse['columns'][number];

interface ColumnExtraction {
  constants: Array<{ name: string; value: unknown }>;
  initialColumns: Column[];
}

function analyzeColumnValues(response: ESQLSearchResponse): Array<{
  name: string;
  unique: boolean;
  constant: boolean;
  empty: boolean;
  index: number;
  column: Column;
}> {
  return response.columns.map((column, index) => {
    const values = new Set<unknown>();
    for (const row of response.values) {
      const val = row[index];
      values.add(isArray(val) ? val.map(String).join(',') : val);
    }
    return {
      name: column.name,
      unique: values.size === response.values.length,
      constant: values.size === 1,
      empty: Array.from(values.values()).every((value) => !value),
      index,
      column,
    };
  });
}

export function getInitialColumnsForLogs({
  response,
  typeDefinitions,
}: {
  response: ESQLSearchResponse;
  typeDefinitions: EntityDefinition[];
}): ColumnExtraction {
  const analyzedColumns = analyzeColumnValues(response);

  const withoutUselessColumns = analyzedColumns.filter(({ column, empty, constant, unique }) => {
    return empty === false && constant === false && !(column.type === 'keyword' && unique);
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

  const allIdentityFields = new Set<string>([
    ...typeDefinitions.flatMap(
      (definition) => definition.identityFields.map(({ field }) => field) ?? []
    ),
  ]);

  const columnsWithIdentityFields = analyzedColumns.filter((column) =>
    allIdentityFields.has(column.name)
  );
  const columnsInOrderOfPreference = [
    ...columnsWithIdentityFields,
    ...withoutUselessColumns,
    ...constantColumns,
  ];

  for (const { column } of columnsInOrderOfPreference) {
    if (initialColumns.size <= 8) {
      initialColumns.add(column);
    } else {
      break;
    }
  }

  const constants = constantColumns.map(({ name, index, column }) => {
    return { name, value: response.values[0][index] };
  });

  return {
    initialColumns: Array.from(initialColumns.values()),
    constants,
  };
}
