/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { SetupUX } from './route';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeQuery } from '../../../../observability/server';
import { TRANSACTION_PAGE_LOAD } from '../../../common/transaction_types';

export async function hasRumData({
  setup,
  start = moment().subtract(24, 'h').valueOf(),
  end = moment().valueOf(),
}: {
  setup: SetupUX;
  start?: number;
  end?: number;
}) {
  try {
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

    const response = await apmEventClient.search('has_rum_data', params);
    return {
      indices: setup.indices.transaction,
      hasData: response.hits.total.value > 0,
      serviceName:
        response.aggregations?.services?.mostTraffic?.buckets?.[0]?.key,
    };
  } catch (e) {
    return {
      hasData: false,
      serviceName: undefined,
      indices: setup.indices.transaction,
    };
  }
}
