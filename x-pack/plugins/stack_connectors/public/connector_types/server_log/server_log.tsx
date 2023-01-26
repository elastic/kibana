/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { ServerLogActionParams } from '../types';

export function getConnectorType(): ConnectorTypeModel<unknown, unknown, ServerLogActionParams> {
  return {
    id: '.server-log',
    iconClass: 'logsApp',
    selectMessage: i18n.translate('xpack.stackConnectors.components.serverLog.selectMessageText', {
      defaultMessage: 'Add a message to a Kibana log.',
    }),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.serverLog.connectorTypeTitle',
      {
        defaultMessage: 'Send to Server log',
      }
    ),
    validateParams: (
      actionParams: ServerLogActionParams
    ): Promise<GenericValidationResult<Pick<ServerLogActionParams, 'message'>>> => {
      const errors = {
        message: new Array<string>(),
      };
      const validationResult = { errors };
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.stackConnectors.components.serverLog.error.requiredServerLogMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: lazy(() => import('./server_log_params')),
  };
}
