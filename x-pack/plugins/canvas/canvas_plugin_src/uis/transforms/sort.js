/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const sort = () => ({
  name: 'sort',
  displayName: 'Datatable sorting',
  args: [
    {
      name: '_',
      displayName: 'Sort field',
      argType: 'datacolumn',
    },
    {
      name: 'reverse',
      displayName: 'Descending',
      argType: 'toggle',
    },
  ],
  resolve({ context }) {
    if (getState(context) === 'ready') return { columns: get(getValue(context), 'columns', []) };

    return { columns: [] };
  },
});
