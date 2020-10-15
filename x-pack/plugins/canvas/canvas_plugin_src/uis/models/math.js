/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';

const { Math: strings } = ModelStrings;

export const math = () => ({
  name: 'math',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: '_',
      displayName: strings.getValueDisplayName(),
      help: strings.getValueHelp(),
      argType: 'datacolumn',
      options: {
        onlyMath: false,
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
