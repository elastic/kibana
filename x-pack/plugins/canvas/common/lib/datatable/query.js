/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function queryDatatable(datatable, query) {
  if (query.size) {
    datatable = {
      ...datatable,
      rows: datatable.rows.slice(0, query.size),
    };
  }

  if (query.and) {
    query.and.forEach((filter) => {
      // handle exact matches
      if (filter.filterType === 'exactly') {
        datatable.rows = datatable.rows.filter((row) => {
          return row[filter.column] === filter.value;
        });
      }

      // handle time filters
      if (filter.filterType === 'time') {
        const columnNames = datatable.columns.map((col) => col.name);

        // remove row if no column match
        if (!columnNames.includes(filter.column)) {
          datatable.rows = [];
          return;
        }

        datatable.rows = datatable.rows.filter((row) => {
          const fromTime = new Date(filter.from).getTime();
          const toTime = new Date(filter.to).getTime();
          const rowTime = new Date(row[filter.column]).getTime();

          return rowTime >= fromTime && rowTime <= toTime;
        });
      }
    });
  }

  return datatable;
}
