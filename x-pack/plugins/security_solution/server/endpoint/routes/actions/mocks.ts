/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TransportResult } from '@elastic/elasticsearch';
import type {
  LogsEndpointAction,
  LogsEndpointActionResponse,
  EndpointAction,
  EndpointActionResponse,
} from '../../../../common/endpoint/types';

export interface Results {
  _index: string;
  _source:
    | LogsEndpointAction
    | LogsEndpointActionResponse
    | EndpointAction
    | EndpointActionResponse;
}
export const mockAuditLogSearchResult = (results?: Results[]) => {
  const response = {
    body: {
      hits: {
        total: { value: results?.length ?? 0, relation: 'eq' },
        hits:
          results?.map((a: Results) => ({
            _index: a._index,
            _id: Math.random().toString(36).split('.')[1],
            _score: 0.0,
            _source: a._source,
          })) ?? [],
      },
    },
    statusCode: 200,
    headers: {},
    warnings: [],
    meta: {} as any,
  };
  return response;
};

export const mockSearchResult = (results: any = []): TransportResult<any> => {
  return {
    body: {
      hits: {
        hits: results.map((a: any) => ({
          _source: a,
        })),
      },
    },
    statusCode: 200,
    headers: {},
    warnings: [],
    meta: {} as any,
  };
};
