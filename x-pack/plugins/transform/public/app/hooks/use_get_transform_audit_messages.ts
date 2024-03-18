/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import type { GetTransformsAuditMessagesResponseSchema } from '../../../common/api_schemas/audit_messages';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { TransformMessage } from '../../../common/types/messages';

import { useAppDependencies } from '../app_dependencies';

export const useGetTransformAuditMessages = (
  transformId: string,
  sortField: keyof TransformMessage,
  sortDirection: 'asc' | 'desc'
) => {
  const { http } = useAppDependencies();

  const query = { sortField, sortDirection };

  return useQuery<GetTransformsAuditMessagesResponseSchema, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_AUDIT_MESSAGES, transformId, query],
    ({ signal }) =>
      http.get<GetTransformsAuditMessagesResponseSchema>(
        addInternalBasePath(`transforms/${transformId}/messages`),
        {
          query,
          version: '1',
          signal,
        }
      )
  );
};
