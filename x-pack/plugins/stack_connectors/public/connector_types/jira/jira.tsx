/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';
import { MAX_OTHER_FIELDS_LENGTH } from '../../../common/jira/constants';
import { JiraConfig, JiraSecrets, JiraActionParams } from './types';

export const JIRA_DESC = i18n.translate('xpack.stackConnectors.components.jira.selectMessageText', {
  defaultMessage: 'Create an incident in Jira.',
});

export const JIRA_TITLE = i18n.translate(
  'xpack.stackConnectors.components.jira.connectorTypeTitle',
  {
    defaultMessage: 'Jira',
  }
);

export function getConnectorType(): ConnectorTypeModel<JiraConfig, JiraSecrets, JiraActionParams> {
  return {
    id: '.jira',
    iconClass: lazy(() => import('./logo')),
    selectMessage: JIRA_DESC,
    actionTypeTitle: JIRA_TITLE,
    actionConnectorFields: lazy(() => import('./jira_connectors')),
    validateParams: async (
      actionParams: JiraActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.summary': new Array<string>(),
        'subActionParams.incident.labels': new Array<string>(),
        'subActionParams.incident.otherFields': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.summary?.length
      ) {
        errors['subActionParams.incident.summary'].push(translations.SUMMARY_REQUIRED);
      }

      if (actionParams.subActionParams?.incident?.labels?.length) {
        // Jira do not allows empty spaces on labels. If the label includes a whitespace show an error.
        if (actionParams.subActionParams.incident.labels.some((label) => label.match(/\s/g)))
          errors['subActionParams.incident.labels'].push(translations.LABELS_WHITE_SPACES);
      }

      try {
        const otherFields = actionParams.subActionParams?.incident?.otherFields;
        if (otherFields) {
          const parsedOtherFields = JSON.parse(otherFields);
          if (Object.keys(parsedOtherFields).length > MAX_OTHER_FIELDS_LENGTH) {
            errors['subActionParams.incident.otherFields'] = [
              translations.OTHER_FIELDS_LENGTH_ERROR(MAX_OTHER_FIELDS_LENGTH),
            ];
          }
        }
      } catch (error) {
        errors['subActionParams.incident.otherFields'] = [translations.INVALID_JSON_FORMAT];
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./jira_params')),
  };
}
