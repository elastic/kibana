/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maybe } from '../../../common/utils/maybe';
import { ProcessorEvent } from '../../../common/processor_event';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../observability/server';
import { Setup } from '../../lib/helpers/setup_request';

export async function getMetadataForBackend({
  setup,
  backendName,
  start,
  end,
}: {
  setup: Setup;
  backendName: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const sampleResponse = await apmEventClient.search('get_backend_sample', {
    apm: {
      events: [ProcessorEvent.span],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            {
              term: {
                [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName,
              },
            },
            ...rangeQuery(start, end),
          ],
        },
      },
      sort: {
        '@timestamp': 'desc',
      },
    },
  });

  const sample = maybe(sampleResponse.hits.hits[0])?._source;

  return {
    spanType: sample?.span.type,
    spanSubtype: sample?.span.subtype,
  };
}
