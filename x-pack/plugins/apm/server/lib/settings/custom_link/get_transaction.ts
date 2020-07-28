/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { PROCESSOR_EVENT } from '../../../../common/elasticsearch_fieldnames';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { Setup } from '../../helpers/setup_request';
import { ProcessorEvent } from '../../../../common/processor_event';
import { filterOptionsRt } from './custom_link_types';
import { splitFilterValueByComma } from './helper';

export async function getTransaction({
  setup,
  filters = {},
}: {
  setup: Setup;
  filters?: t.TypeOf<typeof filterOptionsRt>;
}) {
  const { client, indices } = setup;

  const esFilters = Object.entries(filters)
    // loops through the filters splitting the value by comma and removing white spaces
    .map(([key, value]) => {
      if (value) {
        return { terms: { [key]: splitFilterValueByComma(value) } };
      }
    })
    // removes filters without value
    .filter((value) => value);

  const params = {
    terminateAfter: 1,
    index: indices['apm_oss.transactionIndices'],
    size: 1,
    body: {
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
            ...esFilters,
          ],
        },
      },
    },
  };
  const resp = await client.search<Transaction>(params);
  return resp.hits.hits[0]?._source;
}
