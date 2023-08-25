/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Languages, LanguageDefinition } from '@kbn/search-api-panels';

import { docLinks } from '../../../../../../shared/doc_links';

export const pythonDefinition: LanguageDefinition = {
  buildSearchQuery: ({ indexName }) => `client.search(index="${indexName}", q="snow")`,
  configureClient: ({ url, apiKey }) => `from elasticsearch import Elasticsearch

client = Elasticsearch(
  "${url}",
  api_key="${apiKey}"
)`,
  docLink: docLinks.clientsPythonOverview,
  github: {
    label: i18n.translate('xpack.enterpriseSearch.languages.python.githubLink', {
      defaultMessage: 'elasticsearch-py',
    }),
    link: 'https://github.com/elastic/elasticsearch-py',
  },
  iconType: 'python.svg',
  id: Languages.PYTHON,
  ingestData: ({ indexName }) => `documents = [
  { "index": { "_index": "${indexName}", "_id": "9780553351927"}},
  {"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470},
  { "index": { "_index": "${indexName}", "_id": "9780441017225"}},
  {"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585},
  { "index": { "_index": "${indexName}", "_id": "9780451524935"}},
  {"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328},
  { "index": { "_index": "${indexName}", "_id": "9781451673319"}},
  {"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227},
  { "index": { "_index": "${indexName}", "_id": "9780060850524"}},
  {"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268},
  { "index": { "_index": "${indexName}", "_id": "9780385490818"}},
  {"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311},
]

client.bulk(operations=documents)`,
  ingestDataIndex: '',
  installClient: `python -m pip install elasticsearch

# If your application uses async/await in Python you can install with the async extra
# python -m pip install elasticsearch[async]
  `,
  name: i18n.translate('xpack.enterpriseSearch.languages.python', {
    defaultMessage: 'Python',
  }),
  testConnection: `# API key should have cluster monitor rights
client.info()`,
};
