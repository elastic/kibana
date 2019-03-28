/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';
import { kfetch } from 'ui/kfetch';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function filterColumns(keep: string[], columns: Array<{ id: string; type: string }>) {
  return keep.map(columnId => {
    return columns.find(column => column.id === columnId);
  });
}

function filterRows(keep: string[], rows: Array<{ [id: string]: any }>) {
  return rows.map(row => {
    const newRow = {} as any;
    keep.forEach(columnId => {
      newRow[columnId] = row[columnId];
    });
    return newRow;
  });
}

function essqlFunction() {
  return {
    name: 'client_essql',
    type: 'datatable',
    args: {
      query: {
        types: ['string'],
      },
      keep: {
        types: ['string'],
      },
    },
    context: { types: [] },
    async fn(context: any, args: any) {
      const result: any = await kfetch({
        pathname: '/api/viz_editor/sql',
        method: 'POST',
        body: JSON.stringify({
          sql: args.query,
        }),
      });
      const keepColumns: string[] = JSON.parse(args.keep);

      return {
        type: 'datatable',
        rows: filterRows(keepColumns, result.rows),
        columns: filterColumns(keepColumns, result.columns),
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [essqlFunction],
  });
};

/* Working version (with sample data loaded)
SELECT HISTOGRAM(bytes, 100) AS bytes_bucket, COUNT(*) AS count FROM kibana_sample_data_logs GROUP BY bytes_bucket
*/
