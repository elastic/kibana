/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: i18n.translate('xpack.canvas.uis.views.timefilterControlDisplayName', {
    defaultMessage: 'Time filter',
  }),
  modelArgs: [],
  args: [
    {
      name: 'column',
      displayName: i18n.translate(
        'xpack.canvas.uis.views.timefilterControl.args.columnDisplayName',
        {
          defaultMessage: 'Column',
        }
      ),
      help: i18n.translate('xpack.canvas.uis.views.timefilterControl.args.columnHelpText', {
        defaultMessage: 'Column to which selected time is applied',
      }),
      argType: 'string',
      options: {
        confirm: i18n.translate(
          'xpack.canvas.uis.views.timefilterControl.args.options.confirmButtonLabel',
          {
            defaultMessage: 'Set',
          }
        ),
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { columns: [] };
    return { columns: get(getValue(context), 'columns', []) };
  },
});
