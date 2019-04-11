/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function displayKibanaDatatable() {
  return {
    name: 'display_kibana_datatable',
    type: 'render',
    args: {},
    context: { types: ['kibana_datatable'] },
    fn(context: { rows: any[]; columns: any[] }, args: any) {
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable: {
            columns: context.columns.map(col => (col.name ? col : (col.name = col.id))),
            rows: context.rows,
          },
          paginate: true,
          perPage: 10,
          showHeader: true,
        },
      };
    },
  };
}
