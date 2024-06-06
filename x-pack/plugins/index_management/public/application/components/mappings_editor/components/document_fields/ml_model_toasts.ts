/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useComponentTemplatesContext } from '../../../component_templates/component_templates_context';

export function MLModelNotificationToasts() {
  const { toasts } = useComponentTemplatesContext();
  const showMlSuccessToasts = () => {
    return toasts.addSuccess({
      title: i18n.translate(
        'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentStartedNotification',
        {
          defaultMessage: 'Model deployment started',
        }
      ),
      text: i18n.translate('xpack.idxMgmt.mappingsEditor.createField.modelDeploymentNotification', {
        defaultMessage: '1 model is being deployed on your ml_node.',
      }),
    });
  };
  const showMlErrorToasts = (error: any) => {
    return toasts.addError(
      error.body && error.body.message ? new Error(error.body.message) : error,
      {
        title: i18n.translate(
          'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentErrorTitle',
          {
            defaultMessage: 'Model deployment failed',
          }
        ),
      }
    );
  };
  return { showMlSuccessToasts, showMlErrorToasts };
}
