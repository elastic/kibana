/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { TransformStrings } from '../../../i18n';

const { Sort: strings } = TransformStrings;

export const sort = () => ({
  name: 'sort',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: '_',
      displayName: strings.getSortFieldDisplayName(),
      argType: 'datacolumn',
    },
    {
      name: 'reverse',
      displayName: strings.getReverseDisplayName(),
      argType: 'toggle',
    },
  ],
  resolve({ context }) {
    if (getState(context) === 'ready') {
      return { columns: get(getValue(context), 'columns', []) };
    }

    return { columns: [] };
  },
});
