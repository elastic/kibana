/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { buildESRequest } from '../../../../server/lib/build_es_request';

export const escount = () => ({
  name: 'escount',
  type: 'number',
  help: i18n.translate('xpack.canvas.functions.escountHelpText', {
    defaultMessage: 'Query elasticsearch for a count of the number of hits matching a query',
  }),
  context: {
    types: ['filter'],
  },
  args: {
    index: {
      types: ['string', 'null'],
      default: '_all',
      help: i18n.translate('xpack.canvas.functions.escount.argsIndexHelpText', {
        defaultMessage: 'Specify an index pattern. Eg "logstash-*"',
      }),
    },
    query: {
      types: ['string'],
      aliases: ['_', 'q'],
      help: i18n.translate('xpack.canvas.functions.escount.argsQueryHelpText', {
        defaultMessage: 'A Lucene query string',
      }),
      default: '"-_index:.kibana"',
    },
  },
  fn: (context, args, handlers) => {
    context.and = context.and.concat([
      {
        type: 'luceneQueryString',
        query: args.query,
      },
    ]);

    const esRequest = buildESRequest(
      {
        index: args.index,
        body: {
          query: {
            bool: {
              must: [{ match_all: {} }],
            },
          },
        },
      },
      context
    );

    return handlers.elasticsearchClient('count', esRequest).then(resp => resp.count);
  },
});
