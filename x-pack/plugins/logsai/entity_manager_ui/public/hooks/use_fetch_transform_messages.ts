/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from './use_kibana';
import { entityManagerKeys } from './query_key_factory';

export interface AuditMessageBase {
  message: string;
  level: string;
  timestamp: number;
  node_name: string;
  text?: string;
}

export interface TransformMessage extends AuditMessageBase {
  transform_id: string;
}

export interface GetTransformsAuditMessagesResponseSchema {
  messages: TransformMessage[];
  total: number;
}

export const useFetchTransformMessages = (
  transformId: string,
  sortField: keyof TransformMessage,
  sortDirection: 'asc' | 'desc'
) => {
  const { http } = useKibana().services;
  const query = { sortField, sortDirection };

  return useQuery<GetTransformsAuditMessagesResponseSchema, IHttpFetchError>(
    entityManagerKeys.transformMessages(transformId, sortField, sortDirection),
    ({ signal }) =>
      http.get<GetTransformsAuditMessagesResponseSchema>(
        `/internal/transform/transforms/${transformId}/messages`,
        {
          query,
          version: '1',
          signal,
        }
      )
  );
};
