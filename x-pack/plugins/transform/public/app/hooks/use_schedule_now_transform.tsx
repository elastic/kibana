/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import type { ScheduleNowTransformsRequestSchema } from '../../../common/api_schemas/schedule_now_transforms';
import { isScheduleNowTransformsResponseSchema } from '../../../common/api_schemas/type_guards';

import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { useRefreshTransformList } from '../common';
import { ToastNotificationText } from '../components';

import { useApi } from './use_api';

export const useScheduleNowTransforms = () => {
  const { overlays, theme } = useAppDependencies();
  const refreshTransformList = useRefreshTransformList();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (transformsInfo: ScheduleNowTransformsRequestSchema) => {
    const results = await api.scheduleNowTransforms(transformsInfo);

    if (!isScheduleNowTransformsResponseSchema(results)) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.transform.stepCreateForm.scheduleNowTransformResponseSchemaErrorMessage',
          {
            defaultMessage:
              'An error occurred calling the request to schedule the transform to process data instantly.',
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
            i18n.translate('xpack.transform.transformList.scheduleNowTransformSuccessMessage', {
              defaultMessage:
                'Request to schedule transform {transformId} to process data instantly acknowledged.',
              values: { transformId },
            })
          );
        } else {
          toastNotifications.addError(new Error(JSON.stringify(result.error!.caused_by, null, 2)), {
            title: i18n.translate(
              'xpack.transform.transformList.scheduleNowTransformErrorMessage',
              {
                defaultMessage:
                  'An error occurred scheduling transform {transformId} to process data instantly.',
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
