/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const dropdownControl = () => ({
  name: 'dropdownControl',
  displayName: 'Dropdown Filter',
  modelArgs: [],
  args: [
    {
      name: 'valueColumn',
      displayName: 'Values Column',
      help: 'Column from which to extract values to make available in the dropdown',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
    {
      name: 'filterColumn',
      displayName: 'Filter Column ',
      help: 'Column to which the value selected from the dropdown is applied',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
