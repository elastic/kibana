/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { compact } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { filterOptionsRt } from './custom_link_types';
import { splitFilterValueByComma } from './helper';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTransaction({
  apmEventClient,
  filters = {},
}: {
  apmEventClient: APMEventClient;
  filters?: t.TypeOf<typeof filterOptionsRt>;
}) {
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
      track_total_hits: false,
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
