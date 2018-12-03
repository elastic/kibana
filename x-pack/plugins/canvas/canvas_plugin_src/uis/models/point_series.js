/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const pointseries = () => ({
  name: 'pointseries',
  displayName: 'Dimensions & measures',
  args: [
    {
      name: 'x',
      displayName: 'X-axis',
      help: 'Data along the horizontal axis. Usually a number, string or date',
      argType: 'datacolumn',
    },
    {
      name: 'y',
      displayName: 'Y-axis',
      help: 'Data along the vertical axis. Usually a number',
      argType: 'datacolumn',
    },
    {
      name: 'color',
      displayName: 'Color',
      help: 'Determines the color of a mark or series',
      argType: 'datacolumn',
    },
    {
      name: 'size',
      displayName: 'Size',
      help: 'Determine the size of a mark',
      argType: 'datacolumn',
    },
    {
      name: 'text',
      displayName: 'Text',
      help: 'Set the text to use as, or around, the mark',
      argType: 'datacolumn',
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
