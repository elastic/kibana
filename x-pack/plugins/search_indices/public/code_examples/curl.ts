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

export const CURL_INFO: CodeLanguage = {
  id: 'curl',
  title: i18n.translate('xpack.searchIndices.codingLanguages.curl', { defaultMessage: 'cURL' }),
  icon: 'curl.svg',
  codeBlockLanguage: 'shell',
};

export const CurlCreateIndexExamples: CreateIndexLanguageExamples = {
  default: {
    createIndex: ({ elasticsearchURL, apiKey, indexName }) => `curl PUT '${elasticsearchURL}/${
      indexName ?? INDEX_PLACEHOLDER
    }' \
--header 'Authorization: ApiKey ${apiKey ?? API_KEY_PLACEHOLDER}' \
--header 'Content-Type: application/json'`,
  },
  dense_vector: {
    createIndex: ({ elasticsearchURL, apiKey, indexName }) => `curl PUT '${elasticsearchURL}/${
      indexName ?? INDEX_PLACEHOLDER
    }' \
--header 'Authorization: ApiKey ${apiKey ?? API_KEY_PLACEHOLDER}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "mappings": {
    "properties":{
      "vector":{
        "type": "dense_vector",
        "dims": 3
      },
      "text":{
        "type":"text"
      }
    }
  }
}'`,
  },
};

export const CurlVectorsIngestDataExample: IngestDataCodeDefinition = {
  ingestCommand: ({ elasticsearchURL, apiKey, indexName, sampleDocuments }) => {
    let result = `curl -X POST "${elasticsearchURL}/_bulk?pretty" \
--header 'Authorization: ApiKey ${apiKey ?? API_KEY_PLACEHOLDER}' \
--header 'Content-Type: application/json' \
-d'`;
    sampleDocuments.forEach((document) => {
      result += `
{ "index" : { "_index" : "${indexName}" } }
${JSON.stringify(document)}`;
    });
    result += "\n'";
    return result;
  },
  updateMappingsCommand: ({
    elasticsearchURL,
    apiKey,
    indexName,
    mappingProperties,
  }) => `curl -X PUT "${elasticsearchURL}/${indexName}/_mapping" \
--header 'Authorization: ApiKey ${apiKey ?? API_KEY_PLACEHOLDER}' \
--header 'Content-Type: application/json' \
--data-raw '${JSON.stringify({ properties: mappingProperties })}'`,
};
