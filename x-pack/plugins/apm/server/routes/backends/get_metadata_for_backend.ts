/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maybe } from '../../../common/utils/maybe';
import { ProcessorEvent } from '../../../common/processor_event';
import { rangeQuery, termQuery } from '../../../../observability/server';
import { Setup } from '../../lib/helpers/setup_request';

export async function getMetadataForBackend({
  setup,
  resourceIdentifierFields,
  start,
  end,
}: {
  setup: Setup;
  resourceIdentifierFields: Record<string, string>;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const resourceIdentifierTerms = Object.entries(resourceIdentifierFields).map(
    (x) => {
      return termQuery(x[0], x[1])[0];
    }
  );

  const sampleResponse = await apmEventClient.search('get_backend_sample', {
    apm: {
      events: [ProcessorEvent.span],
    },
    body: {
      size: 1,
      query: {
        bool: {
          filter: [...resourceIdentifierTerms, ...rangeQuery(start, end)],
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
