/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const modelcolumn = () => ({
  name: 'model_column',
  displayName: 'Model columns',
  args: [
    {
      name: 'column',
      displayName: 'Column',
      argType: 'modelcolumnarg',
      multi: true,
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
