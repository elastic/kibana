/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';

export const sort = () => ({
  name: 'sort',
  displayName: i18n.translate('xpack.canvas.uis.transforms.sortDisplayName', {
    defaultMessage: 'Datatable sorting',
  }),
  args: [
    {
      name: '_',
      displayName: i18n.translate('xpack.canvas.uis.transforms.sort.argsSortFieldDisplayName', {
        defaultMessage: 'Sort field',
      }),
      argType: 'datacolumn',
    },
    {
      name: 'reverse',
      displayName: i18n.translate('xpack.canvas.uis.transforms.sort.argsReverseDisplayName', {
        defaultMessage: 'Descending',
      }),
      argType: 'toggle',
    },
  ],
  resolve({ context }) {
    if (getState(context) === 'ready') return { columns: get(getValue(context), 'columns', []) };

    return { columns: [] };
  },
});
