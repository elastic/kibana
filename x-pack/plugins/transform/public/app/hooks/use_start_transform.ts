/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { StartTransformsRequestSchema } from '../../../common/api_schemas/start_transforms';

import { useToastNotifications } from '../app_dependencies';
import { refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';

import { useApi } from './use_api';

export const useStartTransforms = () => {
  const toastNotifications = useToastNotifications();
  const api = useApi();

  return async (transformsInfo: StartTransformsRequestSchema) => {
    const results = await api.startTransforms(transformsInfo);

    for (const transformId in results) {
      // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
      if (results.hasOwnProperty(transformId)) {
        if (results[transformId].success === true) {
          toastNotifications.addSuccess(
            i18n.translate('xpack.transform.transformList.startTransformSuccessMessage', {
              defaultMessage: 'Request to start transform {transformId} acknowledged.',
              values: { transformId },
            })
          );
        } else {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.transformList.startTransformErrorMessage', {
              defaultMessage: 'An error occurred starting the transform {transformId}',
              values: { transformId },
            })
          );
        }
      }
    }

    refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
  };
};
