/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { ResilientActionConnector } from './types';
import {
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '../../simple_connector_form';

const ResilientConnectorFields: React.FC<ActionConnectorFieldsProps<ResilientActionConnector>> = ({
  readOnly,
  isEdit,
}) => {
  const configFormSchema: ConfigFieldSchema[] = [
    { id: 'apiUrl', label: i18n.API_URL_LABEL, isUrlField: true },
    { id: 'orgId', label: i18n.ORG_ID_LABEL },
  ];
  const secretsFormSchema: SecretsFieldSchema[] = [
    { id: 'apiKeyId', label: i18n.API_KEY_ID_LABEL },
    { id: 'apiKeySecret', label: i18n.API_KEY_SECRET_LABEL, isPasswordField: true },
  ];

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
