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
  DEFAULT_GCP_REGION,
} from '../../../common/gemini/constants';
import * as i18n from './translations';

const generationConfig = {
  temperature: 0,
  maxOutputTokens: DEFAULT_TOKEN_LIMIT,
};

const contents = [
  {
    role: 'user',
    parts: [
      {
        text: 'Write the first line of a story about a magic backpack.',
      },
    ],
  },
];

export const DEFAULT_BODY = JSON.stringify({
  contents,
  generation_config: generationConfig,
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
        id="xpack.stackConnectors.components.gemini.geminiAPIDocumentation"
        values={{
          geminiAPIUrlDocs: (
            <EuiLink
              data-test-subj="gemini-api-doc"
              href="https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal#gemini-setup-environment-drest"
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
    id: 'gcpRegion',
    label: i18n.GCP_REGION,
    isUrlField: false,
    defaultValue: DEFAULT_GCP_REGION,
    helpText: (
      <FormattedMessage
        defaultMessage="Please provide the GCP region where the Vertex AI API(s) is enabled. For more information, refer to the {geminiVertexAIDocs}."
        id="xpack.stackConnectors.components.gemini.geminiRegionDocumentation"
        values={{
          geminiVertexAIDocs: (
            <EuiLink
              data-test-subj="gemini-vertexai-api-doc"
              href="https://cloud.google.com/vertex-ai/docs/reference/rest#rest_endpoints"
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
    id: 'gcpProjectID',
    label: i18n.GCP_PROJECT_ID,
    isUrlField: false,
    helpText: (
      <FormattedMessage
        defaultMessage="The GCP Project ID which has Vertex AI API(s) enabled. For more information on the URL, refer to the {geminiVertexAIDocs}."
        id="xpack.stackConnectors.components.gemini.geminiProjectDocumentation"
        values={{
          geminiVertexAIDocs: (
            <EuiLink
              data-test-subj="gemini-api-doc"
              href="https://cloud.google.com/vertex-ai/docs/start/cloud-environment"
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
        defaultMessage="Current support is for the Gemini models. For more information, refer to the {geminiAPIModelDocs}."
        id="xpack.stackConnectors.components.gemini.geminiModelDocumentation"
        values={{
          geminiAPIModelDocs: (
            <EuiLink
              data-test-subj="gemini-api-model-doc"
              href="https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models/"
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
    id: 'credentialsJson',
    label: i18n.CREDENTIALS_JSON,
    isPasswordField: true,
    helpText: (
      <FormattedMessage
        defaultMessage="To authenticate to Gemini API please provide your GCP Service Account credentials JSON data. For more information, refer to the {geminiAuthDocs}."
        id="xpack.stackConnectors.components.gemini.geminiSecretDocumentation"
        values={{
          geminiAuthDocs: (
            <EuiLink
              data-test-subj="aws-api-keys-doc"
              href="https://cloud.google.com/iam/docs/keys-list-get"
              target="_blank"
            >
              {`${i18n.gemini} ${i18n.DOCUMENTATION}`}
            </EuiLink>
          ),
        }}
      />
    ),
  },
];
