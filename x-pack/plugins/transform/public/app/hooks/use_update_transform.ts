/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';

import type {
  PostTransformsUpdateRequestSchema,
  PostTransformsUpdateResponseSchema,
} from '../../../common/api_schemas/update_transforms';
import { addInternalBasePath } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { useRefreshTransformList } from '../common';

export const useUpdateTransform = (
  transformId: TransformId,
  transformConfig: PostTransformsUpdateRequestSchema
) => {
  const { http } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  const mutation = useMutation({
    mutationFn: () => {
      return http.post<PostTransformsUpdateResponseSchema>(
        addInternalBasePath(`transforms/${transformId}/_update`),
        {
          body: JSON.stringify(transformConfig),
          version: '1',
        }
      );
    },
    onSuccess: () => {
      toastNotifications.addSuccess(
        i18n.translate('xpack.transform.transformList.editTransformSuccessMessage', {
          defaultMessage: 'Transform {transformId} updated.',
          values: { transformId },
        })
      );
      refreshTransformList();
    },
  });

  return mutation;
};
