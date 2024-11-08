/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_KEY_PLACEHOLDER, INDEX_PLACEHOLDER } from '../constants';
import { CodeLanguage, IngestDataCodeDefinition } from '../types';
import { CreateIndexLanguageExamples } from './types';

export const JAVASCRIPT_INFO: CodeLanguage = {
  id: 'javascript',
  title: i18n.translate('xpack.searchIndices.codingLanguages.javascript', {
    defaultMessage: 'Javascript',
  }),
  icon: 'javascript.svg',
  codeBlockLanguage: 'javascript',
};

const SERVERLESS_INSTALL_CMD = `npm install @elastic/elasticsearch`;

export const JavascriptServerlessCreateIndexExamples: CreateIndexLanguageExamples = {
  default: {
    installCommand: SERVERLESS_INSTALL_CMD,
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
    }) => `import { Client } from "@elastic/elasticsearch"

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
    }) => `import { Client } from "@elastic/elasticsearch"

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

export const JSServerlessIngestVectorDataExample: IngestDataCodeDefinition = {
  installCommand: SERVERLESS_INSTALL_CMD,
  ingestCommand: ({
    apiKey,
    elasticsearchURL,
    sampleDocuments,
    indexName,
  }) => `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: '${elasticsearchURL}',
  auth: {
    apiKey: "${apiKey ?? API_KEY_PLACEHOLDER}"
  },
});

const index = "${indexName}";
const docs = ${JSON.stringify(sampleDocuments, null, 2)};

const bulkIngestResponse = await client.helpers.bulk({
  index,
  datasource: docs,
  onDocument() {
    return {
      index: {},
    };
  }
});
console.log(bulkIngestResponse);`,
  updateMappingsCommand: ({
    apiKey,
    elasticsearchURL,
    indexName,
    mappingProperties,
  }) => `import { Client } from "@elastic/elasticsearch";

const client = new Client({
node: '${elasticsearchURL}',
auth: {
  apiKey: "${apiKey ?? API_KEY_PLACEHOLDER}"
}
});

const index = "${indexName}";
const mapping = ${JSON.stringify(mappingProperties, null, 2)};

const updateMappingResponse = await client.indices.putMapping({
  index,
  properties: mapping,
});
console.log(updateMappingResponse);`,
};
