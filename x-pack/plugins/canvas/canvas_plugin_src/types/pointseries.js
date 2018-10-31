/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const pointseries = () => ({
  name: 'pointseries',
  from: {
    null: () => {
      return {
        type: 'pointseries',
        rows: [],
        columns: [],
      };
    },
  },
  to: {
    render: (pointseries, types) => {
      const datatable = types.datatable.from(pointseries, types);
      return {
        type: 'render',
        as: 'table',
        value: {
          datatable,
          showHeader: true,
        },
      };
    },
  },
});
