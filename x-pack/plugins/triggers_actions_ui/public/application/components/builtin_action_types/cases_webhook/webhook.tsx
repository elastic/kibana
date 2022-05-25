/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  GenericValidationResult,
  ConnectorValidationResult,
} from '../../../../types';
import {
  CasesWebhookActionParams,
  CasesWebhookConfig,
  CasesWebhookSecrets,
  CasesWebhookActionConnector,
} from './types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<
  CasesWebhookConfig,
  CasesWebhookSecrets,
  CasesWebhookActionParams
> {
  return {
    id: '.cases-webhook',
    // TODO: Steph/cases webhook get an icon
    iconClass: 'indexManagementApp',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a Case Management web service.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.actionTypeTitle',
      {
        defaultMessage: 'Cases Webhook data',
      }
    ),
    validateConnector: async (
      action: CasesWebhookActionConnector
    ): Promise<
      ConnectorValidationResult<
        Omit<CasesWebhookConfig, 'headers' | 'hasAuth'>,
        CasesWebhookSecrets
      >
    > => {
      const translations = await import('./translations');
      const configErrors = {
        createCommentJson: new Array<string>(),
        createCommentMethod: new Array<string>(),
        createCommentUrl: new Array<string>(),
        createIncidentJson: new Array<string>(),
        createIncidentMethod: new Array<string>(),
        createIncidentResponseKey: new Array<string>(),
        createIncidentUrl: new Array<string>(),
        getIncidentResponseCreatedDateKey: new Array<string>(),
        getIncidentResponseExternalTitleKey: new Array<string>(),
        getIncidentResponseUpdatedDateKey: new Array<string>(),
        incidentViewUrl: new Array<string>(),
        getIncidentUrl: new Array<string>(),
        updateIncidentJson: new Array<string>(),
        updateIncidentMethod: new Array<string>(),
        updateIncidentUrl: new Array<string>(),
      };
      const secretsErrors = {
        user: new Array<string>(),
        password: new Array<string>(),
      };
      const validationResult = {
        config: { errors: configErrors },
        secrets: { errors: secretsErrors },
      };
      if (!action.config.createIncidentUrl) {
        configErrors.createIncidentUrl.push(translations.CREATE_URL_REQUIRED);
      }
      if (action.config.createIncidentUrl && !isValidUrl(action.config.createIncidentUrl)) {
        configErrors.createIncidentUrl = [
          ...configErrors.createIncidentUrl,
          translations.URL_INVALID('Create incident'),
        ];
      }
      if (!action.config.createIncidentJson) {
        configErrors.createIncidentJson.push(translations.CREATE_INCIDENT_REQUIRED);
      }
      if (!action.config.createIncidentMethod) {
        configErrors.createIncidentMethod.push(translations.CREATE_METHOD_REQUIRED);
      }
      if (!action.config.createIncidentResponseKey) {
        configErrors.createIncidentResponseKey.push(translations.CREATE_RESPONSE_KEY_REQUIRED);
      }
      if (!action.config.getIncidentUrl) {
        configErrors.getIncidentUrl.push(translations.GET_INCIDENT_URL_REQUIRED);
      }
      if (action.config.getIncidentUrl && !isValidUrl(action.config.getIncidentUrl)) {
        configErrors.getIncidentUrl = [
          ...configErrors.getIncidentUrl,
          translations.URL_INVALID('Get incident'),
        ];
      }
      if (!action.config.getIncidentResponseExternalTitleKey) {
        configErrors.getIncidentResponseExternalTitleKey.push(
          translations.GET_RESPONSE_EXTERNAL_TITLE_KEY_REQUIRED
        );
      }
      if (!action.config.getIncidentResponseCreatedDateKey) {
        configErrors.getIncidentResponseCreatedDateKey.push(
          translations.GET_RESPONSE_EXTERNAL_CREATED_KEY_REQUIRED
        );
      }
      if (!action.config.getIncidentResponseUpdatedDateKey) {
        configErrors.getIncidentResponseUpdatedDateKey.push(
          translations.GET_RESPONSE_EXTERNAL_UPDATED_KEY_REQUIRED
        );
      }
      if (!action.config.incidentViewUrl) {
        configErrors.incidentViewUrl.push(translations.GET_INCIDENT_VIEW_URL);
      }
      if (action.config.incidentViewUrl && !isValidUrl(action.config.incidentViewUrl)) {
        configErrors.incidentViewUrl = [
          ...configErrors.incidentViewUrl,
          translations.URL_INVALID('View incident'),
        ];
      }
      if (!action.config.updateIncidentUrl) {
        configErrors.updateIncidentUrl.push(translations.UPDATE_URL_REQUIRED);
      }
      if (action.config.updateIncidentUrl && !isValidUrl(action.config.updateIncidentUrl)) {
        configErrors.updateIncidentUrl = [
          ...configErrors.updateIncidentUrl,
          translations.URL_INVALID('Update incident'),
        ];
      }
      if (!action.config.updateIncidentJson) {
        configErrors.updateIncidentJson.push(translations.UPDATE_INCIDENT_REQUIRED);
      }
      if (!action.config.updateIncidentMethod) {
        configErrors.updateIncidentMethod.push(translations.UPDATE_METHOD_REQUIRED);
      }
      if (!action.config.createCommentUrl) {
        configErrors.createCommentUrl.push(translations.CREATE_COMMENT_URL_REQUIRED);
      }
      if (action.config.createCommentUrl && !isValidUrl(action.config.createCommentUrl)) {
        configErrors.createCommentUrl = [
          ...configErrors.createCommentUrl,
          translations.URL_INVALID('Create comment'),
        ];
      }
      if (!action.config.createCommentJson) {
        configErrors.createCommentJson.push(translations.CREATE_COMMENT_INCIDENT_REQUIRED);
      }
      if (!action.config.createCommentMethod) {
        configErrors.createCommentMethod.push(translations.CREATE_COMMENT_METHOD_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED);
      }
      if (action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED_FOR_USER);
      }
      if (!action.secrets.user && action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED_FOR_PASSWORD);
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: CasesWebhookActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.summary': new Array<string>(),
      };
      const validationResult = { errors };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.summary?.length
      ) {
        errors['subActionParams.incident.summary'].push(translations.SUMMARY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./webhook_connectors')),
    actionParamsFields: lazy(() => import('./webhook_params')),
  };
}
