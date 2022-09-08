/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public/types';

import {
  ConfigFieldSchema,
  SimpleConnectorForm,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public/application/components/simple_connector_form';
import * as i18n from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  { id: 'apiUrl', label: i18n.API_URL_LABEL, isUrlField: true },
  { id: 'projectKey', label: i18n.JIRA_PROJECT_KEY_LABEL },
];
const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'email', label: i18n.JIRA_EMAIL_LABEL },
  { id: 'apiToken', label: i18n.JIRA_API_TOKEN_LABEL, isPasswordField: true },
];

const JiraConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  return (
    <SimpleConnectorForm
      isEdit={isEdit}
      readOnly={readOnly}
      configFormSchema={configFormSchema}
      secretsFormSchema={secretsFormSchema}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraConnectorFields as default };
