/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { GenericValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TheHiveConnector } from './types';
import { THEHIVE_CONNECTOR_ID, SUB_ACTION, THEHIVE_TITLE } from '../../../common/thehive/constants';
import {
  ExecutorParams,
  ExecutorSubActionPushParams,
  ExecutorSubActionCreateAlertParams,
} from '../../../common/thehive/types';

export function getConnectorType(): TheHiveConnector {
  return {
    id: THEHIVE_CONNECTOR_ID,
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.thehive.descriptionText', {
      defaultMessage: 'Create cases and alerts in TheHive',
    }),
    actionTypeTitle: THEHIVE_TITLE,
    validateParams: async (
      actionParams: ExecutorParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');

      const errors = {
        'pushToServiceParam.incident.title': new Array<string>(),
        'pushToServiceParam.incident.description': new Array<string>(),
        'createAlertParam.title': new Array<string>(),
        'createAlertParam.description': new Array<string>(),
        'createAlertParam.type': new Array<string>(),
        'createAlertParam.source': new Array<string>(),
        'createAlertParam.sourceRef': new Array<string>(),
      };

      const validationResult = {
        errors,
      };

      const { subAction, subActionParams } = actionParams;
      if (subAction === SUB_ACTION.PUSH_TO_SERVICE) {
        const pushToServiceParam = subActionParams as ExecutorSubActionPushParams;
        if (pushToServiceParam && pushToServiceParam.incident) {
          if (!pushToServiceParam.incident.title?.length) {
            errors['pushToServiceParam.incident.title'].push(translations.TITLE_REQUIRED);
          }
          if (!pushToServiceParam.incident.description?.length) {
            errors['pushToServiceParam.incident.description'].push(
              translations.DESCRIPTION_REQUIRED
            );
          }
        }
      } else if (subAction === SUB_ACTION.CREATE_ALERT) {
        const createAlertParam = subActionParams as ExecutorSubActionCreateAlertParams;
        if (createAlertParam) {
          if (!createAlertParam.title?.length) {
            errors['createAlertParam.title'].push(translations.TITLE_REQUIRED);
          }
          if (!createAlertParam.description?.length) {
            errors['createAlertParam.description'].push(translations.DESCRIPTION_REQUIRED);
          }
          if (!createAlertParam.type?.length) {
            errors['createAlertParam.type'].push(translations.TYPE_REQUIRED);
          }
          if (!createAlertParam.source?.length) {
            errors['createAlertParam.source'].push(translations.SOURCE_REQUIRED);
          }
          if (!createAlertParam.sourceRef?.length) {
            errors['createAlertParam.sourceRef'].push(translations.SOURCE_REF_REQUIRED);
          }
        }
      }

      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
