/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const string = () => ({
  name: 'string',
  from: {
    null: () => '',
    boolean: b => String(b),
    number: n => String(n),
  },
  to: {
    render: text => {
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: value => ({
      type: 'datatable',
      columns: [{ name: 'value', type: 'string' }],
      rows: [{ value }],
    }),
  },
});
