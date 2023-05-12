/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ButtonGroupField as SelectField } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { OpenAiProviderType } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import * as i18n from './translations';
import { DEFAULT_URL, DEFAULT_URL_AZURE } from './constants';

const openAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAI API endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.openAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink href="https://platform.openai.com/docs/api-reference" target="_blank">
              {`${i18n.OPEN_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const azureAiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_URL_AZURE,
    helpText: (
      <FormattedMessage
        defaultMessage="The Azure OpenAI API endpoint URL. For more information on the URL, refer to the {genAiAPIUrlDocs}."
        id="xpack.stackConnectors.components.genAi.azureAiDocumentation"
        values={{
          genAiAPIUrlDocs: (
            <EuiLink
              href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference"
              target="_blank"
            >
              {`${i18n.AZURE_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const openAiSecrets: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The OpenAI API authentication key for HTTP Basic authentication. For more details about generating OpenAI API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.openAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink href="https://platform.openai.com/account/api-keys" target="_blank">
              {`${i18n.OPEN_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const azureAiSecrets: SecretsFieldSchema[] = [
  {
    id: 'apiKey',
    label: i18n.API_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The Azure API key for HTTP Basic authentication. For more details about generating Azure OpenAI API keys, refer to the {genAiAPIKeyDocs}."
        id="xpack.stackConnectors.components.genAi.azureAiApiKeyDocumentation"
        values={{
          genAiAPIKeyDocs: (
            <EuiLink
              href="https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#authentication"
              target="_blank"
            >
              {`${i18n.AZURE_AI} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];

const providerOptions = [
  {
    value: OpenAiProviderType.OpenAi,
    label: i18n.OPEN_AI,
  },
  {
    value: OpenAiProviderType.AzureAi,
    label: i18n.AZURE_AI,
  },
];

const GenerativeAiConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config }] = useFormData({
    watch: ['config.apiProvider'],
  });

  const selectedProviderDefaultValue = useMemo(
    () =>
      getFieldDefaultValue<OpenAiProviderType>('config.apiProvider') ?? OpenAiProviderType.OpenAi,
    [getFieldDefaultValue]
  );

  return (
    <>
      <SelectField
        defaultValue={selectedProviderDefaultValue}
        path="config.apiProvider"
        label={i18n.API_PROVIDER_LABEL}
        options={providerOptions}
        isButton={false}
        fullWidth
      />
      <EuiSpacer size="s" />
      {config != null && config.apiProvider === OpenAiProviderType.OpenAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={openAiConfig}
          secretsFormSchema={openAiSecrets}
        />
      )}
      {/* ^v These are intentionally not if/else because of the way the `config.defaultValue` renders */}
      {config != null && config.apiProvider === OpenAiProviderType.AzureAi && (
        <SimpleConnectorForm
          isEdit={isEdit}
          readOnly={readOnly}
          configFormSchema={azureAiConfig}
          secretsFormSchema={azureAiSecrets}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GenerativeAiConnectorFields as default };
