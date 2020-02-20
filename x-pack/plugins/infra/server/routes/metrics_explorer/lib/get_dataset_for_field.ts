/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';

interface EventDatasetHit {
  _source: {
    event?: {
      dataset?: string;
    };
  };
}

export const getDatasetForField = async (
  framework: KibanaFramework,
  requestContext: RequestHandlerContext,
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

  const response = await framework.callWithRequest<EventDatasetHit>(
    requestContext,
    'search',
    params
  );
  if (response.hits.total.value === 0) {
    return null;
  }

  return response.hits.hits?.[0]._source.event?.dataset;
};
