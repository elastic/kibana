/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cloneDeep } from 'lodash';
import { TransportResult } from '@elastic/elasticsearch';
import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const sanitizeBulkErrorResponse = (
  response: TransportResult<estypes.BulkResponse, unknown> | estypes.BulkResponse
): TransportResult<estypes.BulkResponse, unknown> | estypes.BulkResponse => {
  const clonedResponse = cloneDeep(response);
  const isTransportResponse = !!(response as TransportResult<estypes.BulkResponse, unknown>).body;

  const responseToUse: estypes.BulkResponse = isTransportResponse
    ? (clonedResponse as TransportResult<estypes.BulkResponse, unknown>).body
    : (clonedResponse as estypes.BulkResponse);

  if (responseToUse.errors) {
    (responseToUse.items ?? []).forEach(
      (item: Partial<Record<estypes.BulkOperationType, estypes.BulkResponseItem>>) => {
        for (const [_, responseItem] of Object.entries(item)) {
          const reason: string = get(responseItem, 'error.reason');
          const redactIndex = reason ? reason.indexOf(`Preview of field's value:`) : -1;
          if (redactIndex > 1) {
            set(responseItem, 'error.reason', reason.substring(0, redactIndex - 1));
          }
        }
      }
    );
  }

  return clonedResponse;
};
