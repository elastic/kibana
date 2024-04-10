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
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_URL,
  DEFAULT_TOKEN_LIMIT,
} from '../../../common/gemini/constants';
import * as i18n from './translations';

const human = '\n\nHuman:';

export const DEFAULT_BODY = JSON.stringify({
  anthropic_version: 'gemini-1.0-pro-001',
  messages: [{ content: 'Hello world', role: 'user' }],
  max_tokens: DEFAULT_TOKEN_LIMIT,
  stop_sequences: [human],
});

export const geminiConfig: ConfigFieldSchema[] = [
  {
    id: 'apiUrl',
    label: i18n.API_URL_LABEL,
    isUrlField: true,
    defaultValue: DEFAULT_GEMINI_URL,
    helpText: (
      <FormattedMessage
        defaultMessage="The Google Gemini API endpoint URL. For more information on the URL, refer to the {geminiAPIUrlDocs}."
        id="xpack.stackConnectors.components.gemini.geminiDocumentation"
        values={{
          geminiAPIUrlDocs: (
            <EuiLink
              data-test-subj="gemini-api-doc"
              href="https://ai.google.dev/docs"
              target="_blank"
            >
              {`${i18n.gemini} ${i18n.DOCUMENTATION}`}
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
        defaultMessage='Current support is for the Gemini models. For more information, refer to the {geminiAPIModelDocs}.'
        id="xpack.stackConnectors.components.gemini.geminiDocumentationModel"
        values={{
          geminiAPIModelDocs: (
            <EuiLink
              data-test-subj="gemini-api-model-doc"
              href="https://ai.google.dev/docs/"
              target="_blank"
            >
              {`${i18n.gemini} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
    defaultValue: DEFAULT_GEMINI_MODEL,
  },
];

export const geminiSecrets: SecretsFieldSchema[] = [
  {
    id: 'accessKey',
    label: i18n.ACCESS_KEY_LABEL,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="To use the Gemini API, you'll need an API key. If you don't already have one, create a key in Google AI Studio.
        {geminiAPIKeyDocs}."
        id="xpack.stackConnectors.components.gemini.geminiApiKeyDocumentation"
        values={{
          geminiAPIKeyDocs: (
            <EuiLink
              data-test-subj="aws-api-keys-doc"
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
            >
              {`${i18n.gemini} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  // {
  //   id: 'secret',
  //   label: i18n.SECRET,
  //   isPasswordField: true,
  //   helpText: (
  //     <FormattedMessage
  //       defaultMessage="The AWS secret for HTTP Basic authentication. For more details about generating AWS security credentials, refer to the {geminiAPIKeyDocs}."
  //       id="xpack.stackConnectors.components.gemini.geminiSecretDocumentation"
  //       values={{
  //         geminiAPIKeyDocs: (
  //           <EuiLink
  //             data-test-subj="aws-api-keys-doc"
  //             href="https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html"
  //             target="_blank"
  //           >
  //             {`${i18n.gemini} ${i18n.DOCUMENTATION}`}
  //           </EuiLink>
  //         ),
  //       }}
  //     />
  //   ),
  // },
];
