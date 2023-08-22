/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import type {
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../common/api_schemas/transforms';
import { addInternalBasePath } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';
import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { useRefreshTransformList } from '../common';
import { ToastNotificationText } from '../components';

export const useCreateTransform = (
  transformId: TransformId,
  transformConfig: PutTransformsRequestSchema
) => {
  const { http, overlays, theme } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  function errorToast(error: unknown) {
    toastNotifications.addDanger({
      title: i18n.translate('xpack.transform.stepCreateForm.createTransformErrorMessage', {
        defaultMessage: 'An error occurred creating the transform {transformId}:',
        values: { transformId },
      }),
      text: toMountPoint(
        <ToastNotificationText overlays={overlays} theme={theme} text={getErrorMessage(error)} />,
        { theme$: theme.theme$ }
      ),
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      http.put<PutTransformsResponseSchema>(addInternalBasePath(`transforms/${transformId}`), {
        body: JSON.stringify(transformConfig),
        version: '1',
      }),
    onError: (error) => errorToast(error),
    onSuccess: (resp) => {
      if (resp.errors.length > 0) {
        errorToast(resp.errors.length === 1 ? resp.errors[0] : resp.errors);
      } else {
        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.stepCreateForm.createTransformSuccessMessage', {
            defaultMessage: 'Request to create transform {transformId} acknowledged.',
            values: { transformId },
          })
        );
      }

      refreshTransformList();
    },
  });

  return mutation;
};
