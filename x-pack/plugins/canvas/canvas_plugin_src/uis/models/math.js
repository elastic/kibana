/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const math = () => ({
  name: 'math',
  displayName: i18n.translate('xpack.canvas.uis.models.mathDisplayName', {
    defaultMessage: 'Measure',
  }),

  args: [
    {
      name: '_',
      displayName: i18n.translate('xpack.canvas.uis.models.math.args.underscoreDisplayName', {
        defaultMessage: 'Value',
      }),
      help: i18n.translate('xpack.canvas.uis.models.math.args.underscoreHelpText', {
        defaultMessage: 'Function and column to use in extracting a value from the datasource',
      }),
      argType: 'datacolumn',
      options: {
        onlyMath: false,
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
