/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchClient } from '../../../lib/metrics/types';

interface EventDatasetHit {
  _source: {
    event?: {
      dataset?: string;
    };
  };
}

export const getDatasetForField = async (
  client: ESSearchClient,
  field: string,
  indexPattern: string
) => {
  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    terminateAfter: 1,
    index: indexPattern,
    body: {
      query: { exists: { field } },
      size: 1,
      _source: ['event.dataset'],
    },
  };

  const response = await client<EventDatasetHit>(params);

  if (response.hits.total.value === 0) {
    return null;
  }

  return response.hits.hits?.[0]._source.event?.dataset;
};
