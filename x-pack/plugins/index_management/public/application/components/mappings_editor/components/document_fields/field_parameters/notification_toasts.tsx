/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import React from 'react';
interface Props {
  toasts?: IToasts;
  error?: any;
}
export const NotificationToasts = ({ toasts, error }: Props) => {
  return toasts ? (
    <React.Fragment>
      {error !== undefined
        ? toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate(
                'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentErrorTitle',
                {
                  defaultMessage: 'Model deployment failed',
                }
              ),
            }
          )
        : toasts.addSuccess({
            title: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentStartedNotification',
              {
                defaultMessage: 'Model deployment started',
              }
            ),
            text: i18n.translate(
              'xpack.idxMgmt.mappingsEditor.createField.modelDeploymentNotification',
              {
                defaultMessage: '1 model is being deployed on your ml_node.',
              }
            ),
          })}
    </React.Fragment>
  ) : null;
};
