/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

export function sampleDataFunction() {
  return {
    name: 'sample_data',
    type: 'datatable',
    context: { types: [] },
    fn(context: any, args: any) {
      return {
        type: 'datatable',
        rows: [
          { 'col-1': 12345, 'col-2': 5 },
          { 'col-1': 12445, 'col-2': 1 },
          { 'col-1': 12545, 'col-2': 0 },
          { 'col-1': 12645, 'col-2': 8 },
          { 'col-1': 12745, 'col-2': 2 },
          { 'col-1': 12845, 'col-2': 3 },
          { 'col-1': 12945, 'col-2': 2 },
          { 'col-1': 13045, 'col-2': -3 },
        ],
        columns: [{ id: 'col-1', name: 'timestamp' }, { id: 'col-2', name: 'count' }],
      };
    },
  };
}
