/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';

import { TransformEndpointRequest, TransformEndpointResult } from '../../../common';

import { getErrorMessage } from '../../shared_imports';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';
import { TransformListRow, refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';
import { ToastNotificationText } from '../components';

import { useApi } from './use_api';

export const useDeleteTransforms = () => {
  const { overlays } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (transforms: TransformListRow[]) => {
    const transformsInfo: TransformEndpointRequest[] = transforms.map((tf) => ({
      id: tf.config.id,
      state: tf.stats.state,
    }));

    try {
      const results: TransformEndpointResult = await api.deleteTransforms(transformsInfo);
      for (const transformId in results) {
        // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
        if (results.hasOwnProperty(transformId)) {
          if (results[transformId].success === true) {
            toastNotifications.addSuccess(
              i18n.translate('xpack.transform.transformList.deleteTransformSuccessMessage', {
                defaultMessage: 'Request to delete transform {transformId} acknowledged.',
                values: { transformId },
              })
            );
          } else {
            toastNotifications.addDanger(
              i18n.translate('xpack.transform.transformList.deleteTransformErrorMessage', {
                defaultMessage: 'An error occurred deleting the transform {transformId}',
                values: { transformId },
              })
            );
          }
        }
      }

      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
    } catch (e) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.deleteTransformGenericErrorMessage', {
          defaultMessage: 'An error occurred calling the API endpoint to delete transforms.',
        }),
        text: toMountPoint(<ToastNotificationText overlays={overlays} text={getErrorMessage(e)} />),
      });
    }
  };
};
