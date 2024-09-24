/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_KEY_PLACEHOLDER, INDEX_PLACEHOLDER } from '../constants';
import { CodeLanguage, CreateIndexLanguageExamples } from '../types';

export const JAVASCRIPT_INFO: CodeLanguage = {
  id: 'javascript',
  title: i18n.translate('xpack.searchIndices.codingLanguages.javascript', {
    defaultMessage: 'Javascript',
  }),
  icon: 'javascript.svg',
  codeBlockLanguage: 'javascript',
};

const SERVERLESS_INSTALL_CMD = `npm install @elastic/elasticsearch-serverless`;

export const JavascriptServerlessExamples: CreateIndexLanguageExamples = {
  default: {
    installCommand: SERVERLESS_INSTALL_CMD,
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
    }) => `import { Client } from "@elastic/elasticsearch-serverless"

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: "${apiKey ?? API_KEY_PLACEHOLDER}"
  }
});

client.indices.create({
  index: "${indexName ?? INDEX_PLACEHOLDER}",
});`,
  },
  dense_vector: {
    installCommand: SERVERLESS_INSTALL_CMD,
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
    }) => `import { Client } from "@elastic/elasticsearch-serverless"

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: "${apiKey ?? API_KEY_PLACEHOLDER}"
  }
});

client.indices.create({
  index: "${indexName ?? INDEX_PLACEHOLDER}",
  mappings: {
    properties: {
      vector: { type: "dense_vector", dims: 3 },
      text: { type: "text"}
    },
  },
});`,
  },
};
