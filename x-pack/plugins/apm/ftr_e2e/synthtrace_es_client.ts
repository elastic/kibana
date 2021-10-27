/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreakdownMetrics,
  getSpanDestinationMetrics,
  getTransactionMetrics,
  toElasticsearchOutput,
} from '@elastic/apm-synthtrace';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { inspect } from 'util';
import { Client } from '@elastic/elasticsearch';

// TODO: duplicate of x-pack/test/apm_api_integration/common/synthtrace_es_client.ts
// The two clients should be merged and preferably moved into @elastic/apm-synthtrace
export function getSynthtraceEsClient(esTarget: string) {
  const client = new Client({ node: String(esTarget) });

  return {
    index: (events: any[]) => {
      const esEvents = toElasticsearchOutput({
        events: [
          ...events,
          ...getTransactionMetrics(events),
          ...getSpanDestinationMetrics(events),
          ...getBreakdownMetrics(events),
        ],
        writeTargets: {
          transaction: 'apm-7.14.0-transaction',
          span: 'apm-7.14.0-span',
          error: 'apm-7.14.0-error',
          metric: 'apm-7.14.0-metric',
        },
      });

      const batches = chunk(esEvents, 1000);
      const limiter = pLimit(1);

      return Promise.all(
        batches.map((batch) =>
          limiter(() => {
            return client.bulk({
              body: batch.flatMap(({ _index, _source }) => [
                { index: { _index } },
                _source,
              ]),
              require_alias: true,
              refresh: true,
            });
          })
        )
      ).then((results) => {
        const errors = results
          .flatMap((result) => result.body.items)
          .filter((item) => !!item.index?.error)
          .map((item) => item.index?.error);

        if (errors.length) {
          // eslint-disable-next-line no-console
          console.log(inspect(errors.slice(0, 10), { depth: null }));
          throw new Error('Failed to upload some events');
        }
        return results;
      });
    },
    clean: () => {
      return client.deleteByQuery({
        index: 'apm-*',
        body: {
          query: {
            match_all: {},
          },
        },
      });
    },
  };
}
