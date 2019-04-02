/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function mapColumns(keep: string[], columns: Array<{ name: string; type: string }>) {
  return keep.map(columnId => {
    const { name, type } = columns.find(column => column.name === columnId) as any;
    return { id: name, type };
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

function keepFunction() {
  return {
    name: 'remap_essql',
    type: 'kibana_datatable',
    args: {
      keep: {
        types: ['string'],
      },
    },
    context: { types: ['datatable'] },
    async fn(context: any, args: any) {
      const keepColumns: string[] = JSON.parse(args.keep);

      return {
        type: 'kibana_datatable',
        rows: filterRows(keepColumns, context.rows),
        columns: mapColumns(keepColumns, context.columns),
      };
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [keepFunction],
  });
};

/* Working version (with sample data loaded)
SELECT HISTOGRAM(bytes, 100) AS bytes_bucket, COUNT(*) AS count FROM kibana_sample_data_logs GROUP BY bytes_bucket
*/
