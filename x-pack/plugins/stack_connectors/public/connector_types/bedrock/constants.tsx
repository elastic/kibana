/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConfigFieldSchema, SecretsFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import {
  DEFAULT_BEDROCK_MODEL,
  DEFAULT_BEDROCK_URL,
  DEFAULT_TOKEN_LIMIT,
} from '../../../common/bedrock/constants';
import * as i18n from './translations';

const human = '\n\nHuman:';
const assistant = '\n\nAssistant:';

export const DEFAULT_BODY = JSON.stringify({
  prompt: `${human} Hello world! ${assistant}`,
  max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
  stop_sequences: [human],
});

export const bedrockConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_BEDROCK_URL,
    helpText: (
      <FormattedMessage
        defaultMessage="The Amazon Bedrock API endpoint URL. For more information on the URL, refer to the {bedrockAPIUrlDocs}."
        id="xpack.stackConnectors.components.bedrock.bedrockDocumentation"
        values={{
          bedrockAPIUrlDocs: (
            <EuiLink
              data-test-subj="bedrock-api-doc"
              href="https://docs.aws.amazon.com/bedrock/latest/APIReference/welcome.html"
              target="_blank"
            >
              {`${i18n.BEDROCK} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  {
    id: 'defaultModel',
    label: i18n.DEFAULT_MODEL_LABEL,
    helpText: (
      <FormattedMessage
        defaultMessage='Current support is for the Anthropic Claude models. The model can be set on a per request basis by including a "model" parameter alongside the request body. If no model is provided, the fallback will be the default model -  Claude 2. For more information, refer to the {bedrockAPIModelDocs}.'
        id="xpack.stackConnectors.components.bedrock.bedrockDocumentationModel"
        values={{
          bedrockAPIModelDocs: (
            <EuiLink
              data-test-subj="bedrock-api-model-doc"
              href="https://aws.amazon.com/bedrock/claude/"
              target="_blank"
            >
              {`${i18n.BEDROCK} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
    defaultValue: DEFAULT_BEDROCK_MODEL,
  },
];

export const bedrockSecrets: SecretsFieldSchema[] = [
  {
    id: 'accessKey',
    label: i18n.ACCESS_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The AWS access key for HTTP Basic authentication. For more details about generating AWS security credentials, refer to the {bedrockAPIKeyDocs}."
        id="xpack.stackConnectors.components.bedrock.bedrockApiKeyDocumentation"
        values={{
          bedrockAPIKeyDocs: (
            <EuiLink
              data-test-subj="aws-api-keys-doc"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html"
              target="_blank"
            >
              {`${i18n.BEDROCK} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  {
    id: 'secret',
    label: i18n.SECRET,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="The AWS secret for HTTP Basic authentication. For more details about generating AWS security credentials, refer to the {bedrockAPIKeyDocs}."
        id="xpack.stackConnectors.components.bedrock.bedrockSecretDocumentation"
        values={{
          bedrockAPIKeyDocs: (
            <EuiLink
              data-test-subj="aws-api-keys-doc"
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html"
              target="_blank"
            >
              {`${i18n.BEDROCK} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];
