/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import type {
  PostTransformsUpdateRequestSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../common/api_schemas/update_transforms';
import { addInternalBasePath } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';

import { useAppDependencies } from '../app_dependencies';

import { useRefreshTransformList } from './use_refresh_transform_list';

export const useUpdateTransform = (
  transformId: TransformId,
  transformConfig: PostTransformsUpdateRequestSchema
) => {
  const { http } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();

  const mutation = useMutation({
    mutationFn: () =>
      http.post<PostTransformsUpdateResponseSchema>(
        addInternalBasePath(`transforms/${transformId}/_update`),
        {
          body: JSON.stringify(transformConfig),
          version: '1',
        }
      ),
    onSuccess: () => refreshTransformList(),
  });

  return mutation.mutate;
};
