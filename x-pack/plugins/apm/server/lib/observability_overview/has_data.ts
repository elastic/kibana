/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PROCESSOR_EVENT } from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../helpers/setup_request';

export async function hasData({ setup }: { setup: Setup }) {
  const { client, indices } = setup;
  try {
    const params = {
      index: [
        indices['apm_oss.transactionIndices'],
        indices['apm_oss.errorIndices'],
        indices['apm_oss.metricsIndices'],
      ],
      terminateAfter: 1,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  [PROCESSOR_EVENT]: [
                    ProcessorEvent.error,
                    ProcessorEvent.metric,
                    ProcessorEvent.transaction,
                  ],
                },
              },
            ],
          },
        },
      },
    };

    const response = await client.search(params);
    return response.hits.total.value > 0;
  } catch (e) {
    return false;
  }
}
