/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '../../../../../observability/server';
import { ProcessorEvent } from '../../../../common/processor_event';
import { OBSERVER_VERSION_MAJOR } from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';

// returns true if 6.x data is found
export async function getLegacyDataStatus(
  setup: Setup,
  start: number,
  end: number
) {
  const { apmEventClient } = setup;

  const params = {
    terminateAfter: 1,
    apm: {
      events: [ProcessorEvent.transaction],
      includeLegacyData: true,
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { [OBSERVER_VERSION_MAJOR]: { lt: 7 } } },
            ...rangeQuery(start, end),
          ],
        },
      },
    },
  };

  const resp = await apmEventClient.search('get_legacy_data_status', params);
  const hasLegacyData = resp.hits.total.value > 0;
  return hasLegacyData;
}
