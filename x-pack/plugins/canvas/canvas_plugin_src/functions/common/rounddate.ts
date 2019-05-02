/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { ContextFunction } from '../types';

interface Arguments {
  format: string;
}

export function rounddate(): ContextFunction<'rounddate', number, Arguments, number> {
  return {
    name: 'rounddate',
    type: 'number',
    help: 'Round ms since epoch using a moment formatting string. Returns ms since epoch',
    context: {
      types: ['number'],
    },
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help:
          'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/). For example "YYYY-MM" would round to the month',
      },
    },
    fn: (context, args) => {
      if (!args.format) {
        return context;
      }
      return moment.utc(moment.utc(context).format(args.format), args.format).valueOf();
    },
  };
}
