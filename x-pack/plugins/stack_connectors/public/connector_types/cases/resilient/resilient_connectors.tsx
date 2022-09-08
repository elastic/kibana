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
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public/application/components/simple_connector_form';
import * as i18n from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  { id: 'apiUrl', label: i18n.API_URL_LABEL, isUrlField: true },
  { id: 'orgId', label: i18n.ORG_ID_LABEL },
];
const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'apiKeyId', label: i18n.API_KEY_ID_LABEL },
  { id: 'apiKeySecret', label: i18n.API_KEY_SECRET_LABEL, isPasswordField: true },
];

const ResilientConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
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
export { ResilientConnectorFields as default };
