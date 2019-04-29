/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryEsSQL } from '../../../server/lib/query_es_sql';

export function essql() {
  return {
    name: 'essql',
    type: 'datatable',
    context: {
      types: ['filter'],
    },
    help: 'Elasticsearch SQL',
    args: {
      query: {
        aliases: ['_', 'q'],
        types: ['string'],
        help: 'SQL query',
      },
      count: {
        types: ['number'],
        default: 1000,
      },
      timezone: {
        aliases: ['tz'],
        types: ['string'],
        default: 'UTC',
        help: 'Timezone to use for date operations, valid ISO formats and UTC offsets both work',
      },
    },
    fn: (context, args, handlers) =>
      queryEsSQL(handlers.elasticsearchClient, { ...args, filter: context.and }),
  };
}
