/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { maybe } from '../../../common/utils/maybe';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../../lib/helpers/setup_request';

export async function getMetadataForDependency({
  setup,
  dependencyName,
  start,
  end,
}: {
  setup: Setup;
  dependencyName: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const sampleResponse = await apmEventClient.search(
    'get_metadata_for_dependency',
    {
      apm: {
        events: [ProcessorEvent.span],
      },
      body: {
        track_total_hits: false,
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [SPAN_DESTINATION_SERVICE_RESOURCE]: dependencyName,
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
    }
  );

  const sample = maybe(sampleResponse.hits.hits[0])?._source;

  return {
    spanType: sample?.span.type,
    spanSubtype: sample?.span.subtype,
  };
}
