/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_KEY_PLACEHOLDER, INDEX_PLACEHOLDER } from '../constants';
import {
  CodeLanguage,
  CodeSnippetParameters,
  IngestCodeSnippetFunction,
  IngestDataCodeDefinition,
} from '../types';

import { CreateIndexLanguageExamples } from './types';

export const PYTHON_INFO: CodeLanguage = {
  id: 'python',
  title: i18n.translate('xpack.searchIndices.codingLanguages.python', { defaultMessage: 'Python' }),
  icon: 'python.svg',
  codeBlockLanguage: 'python',
};

const SERVERLESS_PYTHON_INSTALL_CMD = 'pip install elasticsearch-serverless';

export const PythonServerlessCreateIndexExamples: CreateIndexLanguageExamples = {
  default: {
    installCommand: SERVERLESS_PYTHON_INSTALL_CMD,
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
    }: CodeSnippetParameters) => `from elasticsearch-serverless import Elasticsearch

client = Elasticsearch(
  "${elasticsearchURL}",
  api_key="${apiKey ?? API_KEY_PLACEHOLDER}"
)

client.indices.create(
  index="${indexName ?? INDEX_PLACEHOLDER}"
)`,
  },
  dense_vector: {
    installCommand: SERVERLESS_PYTHON_INSTALL_CMD,
    createIndex: ({
      elasticsearchURL,
      apiKey,
      indexName,
    }: CodeSnippetParameters) => `from elasticsearch-serverless import Elasticsearch

client = Elasticsearch(
  "${elasticsearchURL}",
  api_key="${apiKey ?? API_KEY_PLACEHOLDER}"
)

client.indices.create(
  index="${indexName ?? INDEX_PLACEHOLDER}"
  mappings={
      "properties": {
          "vector": {"type": "dense_vector", "dims": 3 },
          "text": {"type": "text"}
      }
  }
)`,
  },
};
const serverlessIngestionCommand: IngestCodeSnippetFunction = ({
  elasticsearchURL,
  apiKey,
  indexName,
  sampleDocument,
}) => `from elasticsearch-serverless import Elasticsearch, helpers

client = Elasticsearch(
    "${elasticsearchURL}",
    api_key="${apiKey ?? API_KEY_PLACEHOLDER}"
)

index_name = "${indexName}"

docs = [
${JSON.stringify(sampleDocument, null, 4)},
]

bulk_response = helpers.bulk(client, docs, index=index_name)
print(bulk_response)`;

const serverlessUpdateMappingsCommand: IngestCodeSnippetFunction = ({
  elasticsearchURL,
  apiKey,
  indexName,
  mappingProperties,
}) => `from elasticsearch-serverless import Elasticsearch

client = Elasticsearch(
"${elasticsearchURL}",
api_key="${apiKey ?? API_KEY_PLACEHOLDER}"
)

index_name = "${indexName}"

mappings = ${JSON.stringify({ properties: mappingProperties }, null, 4)}

update_mapping_response = client.indices.put_mapping(index=index_name, body=mappings)

# Print the response
print(update_mapping_response)

# Verify the mapping
mapping = client.indices.get_mapping(index=index_name)
print(mapping)`;

export const PythonServerlessVectorsIngestDataExample: IngestDataCodeDefinition = {
  installCommand: SERVERLESS_PYTHON_INSTALL_CMD,
  ingestCommand: serverlessIngestionCommand,
  updateMappingsCommand: serverlessUpdateMappingsCommand,
};
