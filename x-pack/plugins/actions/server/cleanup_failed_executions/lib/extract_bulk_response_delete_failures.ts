/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportResult } from '@elastic/elasticsearch';

type ResponseFailures = Array<Pick<estypes.BulkResponseItem, '_id' | 'status' | 'result'>>;

export function extractBulkResponseDeleteFailures(
  response: TransportResult<estypes.BulkResponse, unknown>
): ResponseFailures {
  const result: ResponseFailures = [];
  for (const item of response.body.items) {
    if (!item.delete || !item.delete.error) {
      continue;
    }

    result.push({
      _id: item.delete._id,
      status: item.delete.status,
      result: item.delete.result,
    });
  }

  return result;
}
