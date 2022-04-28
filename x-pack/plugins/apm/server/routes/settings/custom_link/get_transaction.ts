/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { compact } from 'lodash';
import { Setup } from '../../../lib/helpers/setup_request';
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
  const { apmEventClient } = setup;

  const esFilters = compact(
    Object.entries(filters)
      // loops through the filters splitting the value by comma and removing white spaces
      .map(([key, value]) => {
        if (value) {
          return { terms: { [key]: splitFilterValueByComma(value) } };
        }
      })
  );

  const params = {
    terminate_after: 1,
    apm: {
      events: [ProcessorEvent.transaction as const],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: esFilters,
        },
      },
    },
  };
  const resp = await apmEventClient.search(
    'get_transaction_for_custom_link',
    params
  );
  return resp.hits.hits[0]?._source;
}
