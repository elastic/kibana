/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import {
  ConfigFieldSchema,
  SimpleConnectorForm,
  SecretsFieldSchema,
} from '../../simple_connector_form';

const configFormSchema: ConfigFieldSchema[] = [
  { id: 'url', label: i18n.D3_URL_LABEL, isUrlField: true }
];
const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'token', label: i18n.D3_TOKEN_LABEL }
];

const D3SecurityConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
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
export { D3SecurityConnectorFields as default };
