/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Languages, LanguageDefinition } from '@kbn/search-api-panels';

import { docLinks } from '../../doc_links';

import { INDEX_NAME_PLACEHOLDER } from './constants';

import { ingestKeysToJSON } from './helpers';

export const curlDefinition: LanguageDefinition = {
  buildSearchQuery: ({
    indexName = INDEX_NAME_PLACEHOLDER,
  }) => `curl -X POST "\$\{ES_URL\}/${indexName}/_search?pretty" \\
  -H "Authorization: ApiKey "\$\{API_KEY\}"" \\
  -H "Content-Type: application/json" \\
  -d'
{
  "query": {
    "query_string": {
      "query": "snow"
    }
  }
}'`,
  configureClient: ({ apiKey, url }) => `export ES_URL="${url}"
export API_KEY="${apiKey}"`,
  docLink: docLinks.restApis,
  github: {
    label: i18n.translate('xpack.enterpriseSearch.languages.cURL.githubLink', {
      defaultMessage: 'curl',
    }),
    link: 'https://github.com/curl/curl',
  },
  iconType: 'curl.svg',
  id: Languages.CURL,
  ingestData: ({
    indexName = INDEX_NAME_PLACEHOLDER,
    ingestPipeline,
    extraIngestDocumentValues,
  }) => {
    const ingestDocumentKeys = ingestPipeline ? ingestKeysToJSON(extraIngestDocumentValues) : '';
    return `curl -X POST "\$\{ES_URL\}/_bulk?pretty${
      ingestPipeline ? `&pipeline=${ingestPipeline}` : ''
    }" \\
  -H "Authorization: ApiKey "\$\{API_KEY\}"" \\
  -H "Content-Type: application/json" \\
  -d'
{ "index" : { "_index" : "${indexName}" } }
{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470${ingestDocumentKeys}}
{ "index" : { "_index" : "${indexName}" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585${ingestDocumentKeys}}
{ "index" : { "_index" : "${indexName}" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328${ingestDocumentKeys}}
{ "index" : { "_index" : "${indexName}" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227${ingestDocumentKeys}}
{ "index" : { "_index" : "${indexName}" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268${ingestDocumentKeys}}
{ "index" : { "_index" : "${indexName}" } }
{"name": "The Handmaid'"'"'s Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311${ingestDocumentKeys}}
'`;
  },
  ingestDataIndex: '',
  installClient: `# if cURL is not already installed on your system
# then install it with the package manager of your choice

# example
brew install curl`,
  name: i18n.translate('xpack.enterpriseSearch.languages.cURL', {
    defaultMessage: 'cURL',
  }),
  languageStyling: 'shell',
  testConnection: ({ indexName = INDEX_NAME_PLACEHOLDER }) => `curl "\$\{ES_URL\}/${indexName}" \\
  -H "Authorization: ApiKey "\$\{API_KEY\}"" \\
  -H "Content-Type: application/json"`,
};
