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

export function formatdate(): ContextFunction<'formatdate', number, Arguments, string> {
  return {
    name: 'formatdate',
    type: 'string',
    help: 'Output a ms since epoch number as a formatted string',
    context: {
      types: ['number'],
    },
    args: {
      format: {
        aliases: ['_'],
        types: ['string'],
        help: 'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/)',
      },
    },
    fn: (context, args) => {
      if (!args.format) {
        return moment.utc(new Date(context)).toISOString();
      }
      return moment.utc(new Date(context)).format(args.format);
    },
  };
}
