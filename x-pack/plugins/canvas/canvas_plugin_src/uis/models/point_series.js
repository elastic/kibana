/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getState, getValue } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';

const { PointSeries: strings } = ModelStrings;

export const pointseries = () => ({
  name: 'pointseries',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'x',
      displayName: strings.getXAxisDisplayName(),
      help: strings.getXAxisHelp(),
      argType: 'datacolumn',
    },
    {
      name: 'y',
      displayName: strings.getYaxisDisplayName(),
      help: strings.getYaxisHelp(),
      argType: 'datacolumn',
    },
    {
      name: 'color',
      displayName: strings.getColorDisplayName(),
      help: strings.getColorHelp(),
      argType: 'datacolumn',
    },
    {
      name: 'size',
      displayName: strings.getSizeDisplayName(),
      help: strings.getSizeHelp(),
      argType: 'datacolumn',
    },
    {
      name: 'text',
      displayName: strings.getTextDisplayName(),
      help: strings.getTextHelp(),
      argType: 'datacolumn',
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') {
      return { columns: [] };
    }
    return { columns: get(getValue(context), 'columns', []) };
  },
});
