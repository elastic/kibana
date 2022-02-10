/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

import type { StopTransformsRequestSchema } from '../../../common/api_schemas/stop_transforms';
import { isStopTransformsResponseSchema } from '../../../common/api_schemas/type_guards';

import { getErrorMessage } from '../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';
import { ToastNotificationText } from '../components';

import { useApi } from './use_api';

export const useStopTransforms = () => {
  const { overlays, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (transformsInfo: StopTransformsRequestSchema) => {
    const results = await api.stopTransforms(transformsInfo);

    if (!isStopTransformsResponseSchema(results)) {
      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.transform.transformList.stopTransformResponseSchemaErrorMessage',
          {
            defaultMessage: 'An error occurred called the stop transforms request.',
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
        if (results[transformId].success === true) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.stopTransformSuccessMessage', {
              defaultMessage: 'Request to stop data frame transform {transformId} acknowledged.',
              values: { transformId },
            })
          );
        } else {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.transformList.stopTransformErrorMessage', {
              defaultMessage: 'An error occurred stopping the data frame transform {transformId}',
              values: { transformId },
            })
          );
        }
      }
    }

    refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
  };
};
