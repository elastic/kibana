/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import { DEFAULT_URL } from './constants';

const configFormSchema: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAi URL. For more information on the URL, refer to the {openAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.openAi.apiUrlDocumentation"
        values={{
          openAiAPIUrlDocs: (
            <EuiLink href="https://platform.openai.com/docs/api-reference" target="_blank">
              {i18n.OPEN_AI_DOCUMENTATION}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAi API authentication key for HTTP Basic authentication. For more details about generating OpenAi API keys, refer to the {openAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.openAi.apiKeyDocumentation"
        values={{
          openAiAPIKeyDocs: (
            <EuiLink href="https://platform.openai.com/account/api-keys" target="_blank">
              {i18n.OPEN_AI_DOCUMENTATION}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const OpenAiConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
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
export { OpenAiConnectorFields as default };
