/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Languages, LanguageDefinition } from '@kbn/search-api-panels';
import { docLinks } from '../../../../common/doc_links';
import { INDEX_NAME_PLACEHOLDER } from '../../constants';

export const rubyDefinition: LanguageDefinition = {
  advancedConfig: docLinks.rubyAdvancedConfig,
  apiReference: docLinks.rubyExamples,
  buildSearchQuery: `client.search(index: 'books', q: 'snow')`,
  configureClient: ({ url, apiKey }) => `client = ElasticsearchServerless::Client.new(
  api_key: '${apiKey}',
  url: '${url}'
)
`,
  basicConfig: docLinks.rubyBasicConfig,
  docLink: docLinks.rubyClient,
  iconType: 'ruby.svg',
  id: Languages.RUBY,
  ingestData: `documents = [
  { index: { _index: 'books', data: {name: "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470} } },
  { index: { _index: 'books', data: {name: "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585} } },
  { index: { _index: 'books', data: {name: "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328} } },
  { index: { _index: 'books', data: {name: "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227} } },
  { index: { _index: 'books', data: {name: "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268} } },
  { index: { _index: 'books', data: {name: "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311} } }
]
client.bulk(body: documents)`,
  ingestDataIndex: ({ apiKey, url, indexName }) => `client = ElasticsearchServerless::Client.new(
  api_key: '${apiKey}',
  url: '${url}'
)

documents = [
  { index: { _index: '${
    indexName ?? INDEX_NAME_PLACEHOLDER
  }', data: {name: "foo", "title": "bar"} } },
]
client.bulk(body: documents)
`,
  installClient: `# Requires Ruby version 3.0 or higher

# From the project's root directory:$ gem build elasticsearch-serverless.gemspec
$ gem install elasticsearch-serverless-x.x.x.gem`,
  name: i18n.translate('xpack.serverlessSearch.languages.ruby', {
    defaultMessage: 'Ruby',
  }),
  testConnection: `client.info`,
};
