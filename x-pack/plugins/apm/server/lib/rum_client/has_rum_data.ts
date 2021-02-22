/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../helpers/setup_request';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeQuery } from '../../../common/utils/queries';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';

export async function hasRumData({ setup }: { setup: Setup & SetupTimeRange }) {
  try {
    const { start, end } = setup;

    const params = {
      apm: {
        events: [ProcessorEvent.transaction],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [{ term: { [TRANSACTION_TYPE]: TRANSACTION_PAGE_LOAD } }],
          },
        },
        aggs: {
          services: {
            filter: rangeQuery(start, end)[0],
            aggs: {
              mostTraffic: {
                terms: {
                  field: SERVICE_NAME,
                  size: 1,
                },
              },
            },
          },
        },
      },
    };

    const { apmEventClient } = setup;

    const response = await apmEventClient.search(params);
    return {
      hasData: response.hits.total.value > 0,
      serviceName:
        response.aggregations?.services?.mostTraffic?.buckets?.[0]?.key,
    };
  } catch (e) {
    return { hasData: false, serviceName: undefined };
  }
}
