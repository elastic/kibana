/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { takeRight } from 'lodash';

export const tail = () => ({
  name: 'tail',
  aliases: [],
  type: 'datatable',
  help: i18n.translate('xpack.canvas.functions.tailHelpText', {
    defaultMessage: 'Get the last N rows from the end of a datatable. Also see `head`',
  }),
  context: {
    types: ['datatable'],
  },
  args: {
    count: {
      aliases: ['_'],
      types: ['number'],
      help: i18n.translate('xpack.canvas.functions.tail.args.countHelpText', {
        defaultMessage: 'Return this many rows from the end of the datatable',
      }),
    },
  },
  fn: (context, args) => ({
    ...context,
    rows: takeRight(context.rows, args.count),
  }),
});
