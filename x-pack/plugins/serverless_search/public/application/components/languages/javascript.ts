/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Languages, LanguageDefinition } from '@kbn/search-api-panels';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../common/doc_links';

export const javascriptDefinition: LanguageDefinition = {
  apiReference: docLinks.jsApiReference,
  basicConfig: docLinks.jsBasicConfig,
  buildSearchQuery: `// Let's search!
const searchResult = await client.search({
  index: 'my-index-name',
  q: 'snow'
});

console.log(searchResult.hits.hits)
`,
  configureClient: ({
    url,
    apiKey,
  }) => `const { Client } = require('@elastic/elasticsearch-serverless');
const client = new Client({
  node: '${url}',
  auth: {
    apiKey: '${apiKey}'
  }
});`,
  docLink: docLinks.jsClient,
  github: {
    link: 'https://github.com/elastic/elasticsearch-serverless-js',
    label: i18n.translate('xpack.serverlessSearch.languages.javascript.githubLabel', {
      defaultMessage: 'elasticsearch-serverless',
    }),
  },
  iconType: 'javascript.svg',
  id: Languages.JAVASCRIPT,
  ingestData: `// Sample books data
const dataset = [
  {"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470},
  {"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585},
  {"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328},
  {"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227},
  {"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268},
  {"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}
];

// Index with the bulk helper
const result = await client.helpers.bulk({
  datasource: dataset,
  onDocument (doc) {
    return { index: { _index: 'my-index-name' }};
  }
});

console.log(result);
/**
{
  total: 6,
  failed: 0,
  retry: 0,
  successful: 6,
  noop: 0,
  time: 191,
  bytes: 787,
  aborted: false
}
*/`,
  ingestDataIndex: ({
    apiKey,
    url,
    indexName,
  }) => `const { Client } = require('@elastic/elasticsearch-serverless');
const client = new Client({
  node: '${url}',
  auth: {
      apiKey: '${apiKey}'
  }
});
const dataset = [
  {'name': 'foo', 'title': 'bar'},
];

// Index with the bulk helper
const result = await client.helpers.bulk({
  datasource: dataset,
  onDocument (doc) {
    return { index: { _index: '${indexName ?? 'index_name'}' }};
  }
});
console.log(result);
`,
  installClient: 'npm install @elastic/elasticsearch-serverless',
  name: i18n.translate('xpack.serverlessSearch.languages.javascript', {
    defaultMessage: 'JavaScript',
  }),
  testConnection: `const resp = await client.info();

console.log(resp);
/**
{
  name: 'instance-0000000000',
  cluster_name: 'd9dcd35d12fe46dfaa28ec813f65d57b',
  cluster_uuid: 'iln8jaivThSezhTkzp0Knw',
  version: {
    build_flavor: 'default',
    build_type: 'docker',
    build_hash: 'c94b4700cda13820dad5aa74fae6db185ca5c304',
    build_date: '2022-10-24T16:54:16.433628434Z',
    build_snapshot: false,
    lucene_version: '9.4.1',
    minimum_wire_compatibility_version: '7.17.0',
    minimum_index_compatibility_version: '7.0.0'
  },
  tagline: 'You Know, for Search'
}
*/`,
};
