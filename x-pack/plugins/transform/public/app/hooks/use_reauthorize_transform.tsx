/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import type { StartTransformsRequestSchema } from '../../../common/api_schemas/start_transforms';
import { isStartTransformsResponseSchema } from '../../../common/api_schemas/type_guards';

import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { useRefreshTransformList } from '../common';
import { ToastNotificationText } from '../components';

import { useApi } from './use_api';

export const useReauthorizeTransforms = () => {
  const { overlays, theme } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (transformsInfo: StartTransformsRequestSchema) => {
    const results = await api.reauthorizeTransforms(transformsInfo);

    if (!isStartTransformsResponseSchema(results)) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.transform.stepCreateForm.reauthorizeTransformResponseSchemaErrorMessage',
          {
            defaultMessage: 'An error occurred calling the reauthorize transforms request.',
          }
        ),
        text: toMountPoint(
          <ToastNotificationText
            overlays={overlays}
            theme={theme}
            text={getErrorMessage(results)}
          />,
          { theme$: theme.theme$ }
        ),
      });
      return;
    }

    for (const transformId in results) {
      // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
      if (results.hasOwnProperty(transformId)) {
        const result = results[transformId];
        if (result.success === true) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.reauthorizeTransformSuccessMessage', {
              defaultMessage: 'Request to reauthorize transform {transformId} acknowledged.',
              values: { transformId },
            })
          );
        } else {
          toastNotifications.addError(new Error(JSON.stringify(result.error!.caused_by, null, 2)), {
            title: i18n.translate(
              'xpack.transform.transformList.reauthorizeTransformErrorMessage',
              {
                defaultMessage: 'An error occurred reauthorizing the transform {transformId}',
                values: { transformId },
              }
            ),
            toastMessage: result.error!.reason,
          });
        }
      }
    }

    refreshTransformList();
  };
};
