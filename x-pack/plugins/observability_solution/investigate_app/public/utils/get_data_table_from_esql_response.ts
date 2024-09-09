/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ESQLColumn, ESQLRow } from '@kbn/es-types';
import type { EsqlColumnMeta } from '../services/esql';
import { getKibanaColumns } from './get_kibana_columns';

type Primitive = string | boolean | number | null;

export function getDatatableFromEsqlResponse({
  columns,
  values,
  all_columns: allColumns,
}: {
  all_columns?: ESQLColumn[];
  columns: ESQLColumn[];
  values: ESQLRow[];
}): Datatable {
  const kibanaColumns: EsqlColumnMeta[] = getKibanaColumns(allColumns ?? columns);

  const datatable: Datatable = {
    columns: kibanaColumns,
    rows: values.map((row) => {
      return row.reduce<Record<string, Primitive | Primitive[]>>((prev, current, index) => {
        const column = columns[index];
        prev[column.name] = current as Primitive | Primitive[];
        return prev;
      }, {});
    }),
    type: 'datatable',
    meta: {
      type: 'esql',
    },
  };

  return datatable;
}
