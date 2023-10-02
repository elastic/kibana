/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type {
  ResetTransformsRequestSchema,
  ResetTransformsResponseSchema,
} from '../../../common/api_schemas/reset_transforms';
import { addInternalBasePath } from '../../../common/constants';
import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { ToastNotificationText } from '../components';

import { useRefreshTransformList } from './use_refresh_transform_list';

export const useResetTransforms = () => {
  const { http, i18n: i18nStart, theme } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();

  const mutation = useMutation({
    mutationFn: (reqBody: ResetTransformsRequestSchema) =>
      http.post<ResetTransformsResponseSchema>(addInternalBasePath('reset_transforms'), {
        body: JSON.stringify(reqBody),
        version: '1',
      }),
    onError: (error) =>
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.resetTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to reset transforms.',
        }),
        text: toMountPoint(
          <ToastNotificationText previewTextLength={50} text={getErrorMessage(error)} />,
          {
            theme,
            i18n: i18nStart,
          }
        ),
      }),
    onSuccess: (results) => {
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          const status = results[transformId];

          if (status.transformReset?.error) {
            const error = status.transformReset.error.reason;
            toastNotifications.addDanger({
              title: i18n.translate('xpack.transform.transformList.resetTransformErrorMessage', {
                defaultMessage: 'An error occurred resetting the transform {transformId}',
                values: { transformId },
              }),
              text: toMountPoint(<ToastNotificationText previewTextLength={50} text={error} />, {
                theme,
                i18n: i18nStart,
              }),
            });
          }
        }
      }

      refreshTransformList();
    },
  });

  return mutation.mutate;
};
