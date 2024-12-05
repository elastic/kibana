/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import * as translations from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  {
    id: 'url',
    label: translations.URL_LABEL,
    isUrlField: true,
  },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  {
    id: 'token',
    label: translations.TOKEN_LABEL,
    isPasswordField: true,
  },
];

const MicrosoftDefenderEndpointActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps
> = ({ readOnly, isEdit }) => (
  <SimpleConnectorForm
    isEdit={isEdit}
    readOnly={readOnly}
    configFormSchema={configFormSchema}
    secretsFormSchema={secretsFormSchema}
  />
);

// eslint-disable-next-line import/no-default-export
export { MicrosoftDefenderEndpointActionConnectorFields as default };
