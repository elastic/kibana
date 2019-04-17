/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: 'Time filter',
  modelArgs: [],
  args: [
    {
      name: 'column',
      displayName: 'Column',
      help: 'Column to which selected time is applied',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterGroup',
      displayName: 'Filter Group',
      help: 'Add a group name to the filter for individual selection',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
  ],
});
