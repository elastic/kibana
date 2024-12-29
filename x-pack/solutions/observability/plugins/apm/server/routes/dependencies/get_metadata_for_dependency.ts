/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { maybe } from '../../../common/utils/maybe';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export interface MetadataForDependencyResponse {
  spanType: string | undefined;
  spanSubtype: string | undefined;
}

export async function getMetadataForDependency({
  apmEventClient,
  dependencyName,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  dependencyName: string;
  start: number;
  end: number;
}): Promise<MetadataForDependencyResponse> {
  const fields = asMutableArray([SPAN_TYPE, SPAN_SUBTYPE] as const);
  const sampleResponse = await apmEventClient.search('get_metadata_for_dependency', {
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
      fields,
      sort: {
        '@timestamp': 'desc',
      },
    },
  });

  const sample = unflattenKnownApmEventFields(maybe(sampleResponse.hits.hits[0])?.fields);

  return {
    spanType: sample?.span?.type,
    spanSubtype: sample?.span?.subtype,
  };
}
