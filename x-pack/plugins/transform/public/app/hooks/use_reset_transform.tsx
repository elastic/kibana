/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import type {
  ResetTransformStatus,
  ResetTransformsRequestSchema,
} from '../../../common/api_schemas/reset_transforms';
import { isResetTransformsResponseSchema } from '../../../common/api_schemas/type_guards';
import { getErrorMessage } from '../../../common/utils/errors';
import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { REFRESH_TRANSFORM_LIST_STATE, refreshTransformList$ } from '../common';
import { ToastNotificationText } from '../components';
import { useApi } from './use_api';

type SuccessCountField = keyof Omit<ResetTransformStatus, 'destinationIndex'>;

export const useResetTransforms = () => {
  const { overlays, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (reqBody: ResetTransformsRequestSchema) => {
    const results = await api.resetTransforms(reqBody);

    if (!isResetTransformsResponseSchema(results)) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.resetTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to reset transforms.',
        }),
        text: toMountPoint(
          <ToastNotificationText
            previewTextLength={50}
            overlays={overlays}
            theme={theme}
            text={getErrorMessage(results)}
          />,
          { theme$: theme.theme$ }
        ),
      });
      return;
    }

    const isBulk = Object.keys(results).length > 1;
    const successCount: Record<SuccessCountField, number> = {
      transformReset: 0,
    };
    for (const transformId in results) {
      // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
      if (results.hasOwnProperty(transformId)) {
        const status = results[transformId];

        // if we are only resetting one transform, show the success toast messages
        if (!isBulk && status.transformReset) {
          if (status.transformReset?.success) {
            toastNotifications.addSuccess(
              i18n.translate('xpack.transform.transformList.resetTransformSuccessMessage', {
                defaultMessage: 'Request to reset transform {transformId} acknowledged.',
                values: { transformId },
              })
            );
          }
        } else {
          (Object.keys(successCount) as SuccessCountField[]).forEach((key) => {
            if (status[key]?.success) {
              successCount[key] = successCount[key] + 1;
            }
          });
        }
        if (status.transformReset?.error) {
          const error = status.transformReset.error.reason;
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.transformList.resetTransformErrorMessage', {
              defaultMessage: 'An error occurred resetting the transform {transformId}',
              values: { transformId },
            }),
            text: toMountPoint(
              <ToastNotificationText
                previewTextLength={50}
                overlays={overlays}
                theme={theme}
                text={error}
              />,
              { theme$: theme.theme$ }
            ),
          });
        }
      }
    }

    // if we are deleting multiple transforms, combine the success messages
    if (isBulk) {
      if (successCount.transformReset > 0) {
        toastNotifications.addSuccess(
          i18n.translate('xpack.transform.transformList.bulkResetTransformSuccessMessage', {
            defaultMessage:
              'Successfully reset {count} {count, plural, one {transform} other {transforms}}.',
            values: { count: successCount.transformReset },
          })
        );
      }
    }

    refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
  };
};
