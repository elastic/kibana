/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../helpers/setup_request';

export async function hasData({ setup }: { setup: Setup }) {
  const { apmEventClient } = setup;
  try {
    const params = {
      apm: {
        events: [
          ProcessorEvent.transaction,
          ProcessorEvent.error,
          ProcessorEvent.metric,
        ],
      },
      terminateAfter: 1,
      body: {
        size: 0,
      },
    };

    const response = await apmEventClient.search(params);
    return response.hits.total.value > 0;
  } catch (e) {
    return false;
  }
}
