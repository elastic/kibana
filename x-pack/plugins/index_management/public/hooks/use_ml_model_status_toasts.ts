/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ErrorType, extractErrorProperties, MLRequestFailure } from '@kbn/ml-error-utils';
import { useComponentTemplatesContext } from '../application/components/component_templates/component_templates_context';

export function useMLModelNotificationToasts() {
  const { toasts } = useComponentTemplatesContext();
  const showSuccessToasts = () => {
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
  const showErrorToasts = (error: ErrorType) => {
    const errorObj = extractErrorProperties(error);
    return toasts.addError(new MLRequestFailure(errorObj, error), {
      title: i18n.translate('xpack.idxMgmt.mappingsEditor.createField.modelDeploymentErrorTitle', {
        defaultMessage: 'Model deployment failed',
      }),
    });
  };
  return { showSuccessToasts, showErrorToasts };
}
