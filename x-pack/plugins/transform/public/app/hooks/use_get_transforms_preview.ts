/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import type {
  PostTransformsPreviewRequestSchema,
  PostTransformsPreviewResponseSchema,
} from '../../../server/routes/api_schemas/transforms';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export const useGetTransformsPreview = (
  obj: PostTransformsPreviewRequestSchema,
  enabled?: boolean
) => {
  const { http } = useAppDependencies();

  return useQuery<PostTransformsPreviewResponseSchema, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORMS_PREVIEW, obj],
    ({ signal }) =>
      http.post<PostTransformsPreviewResponseSchema>(addInternalBasePath('transforms/_preview'), {
        body: JSON.stringify(obj),
        version: '1',
        signal,
      }),
    { enabled }
  );
};
