/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../common/doc_links';
import { LanguageDefinition, Languages } from './types';

export const goDefinition: LanguageDefinition = {
  advancedConfig: docLinks.goAdvancedConfig,
  basicConfig: docLinks.goBasicConfig,
  buildSearchQuery: `searchResp, err := es.Search(
  es.Search.WithIndex("books"),
  es.Search.WithPretty(),
  es.Search.WithQuery("snow"),
)

fmt.Println(searchResp, err)`,
  configureClient: ({ url, apiKey }) => `import (
  "fmt"
  "log"
  "strings"

  "github.com/elastic/go-elasticsearch/v8"
)

cfg := elasticsearch.Config{
  Addresses: []string{
      "${url}",
  },
  APIKey: "${apiKey}",
}
es, err := elasticsearch.NewClient(cfg)
if err != nil {
  log.Fatalf("Error creating the client: %s", err)
}`,
  docLink: docLinks.goClient,
  iconType: 'go.svg',
  id: Languages.GO,
  ingestData: `ingestResult, err := es.Bulk(
  strings.NewReader(\`
{"index":{"_id":"9780553351927"}}
{"name":"Snow Crash","author":"Neal Stephenson","release_date":"1992-06-01","page_count": 470}
{ "index": { "_id": "9780441017225"}}
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index": { "_id": "9780451524935"}}
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index": { "_id": "9781451673319"}}
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index": { "_id": "9780060850524"}}
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index": { "_id": "9780385490818"}}
{"name": "The Handmaid's Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}\n\`),
  es.Bulk.WithIndex("books"),
)
fmt.Println(ingestResult, err)`,
  ingestDataIndex: ({ apiKey, url, indexName }) => `import (
  "fmt"
  "log"
  "strings"

  "github.com/elastic/go-elasticsearch/v8"
)

cfg := elasticsearch.Config{
  Addresses: []string{
      "${url}",
  },
  APIKey: "${apiKey}",
}
es, err := elasticsearch.NewClient(cfg)
if err != nil {
  log.Fatalf("Error creating the client: %s", err)
}

res, err := es.Bulk(
	strings.NewReader(\`
{ "index": { "_id": "1"}}
{"name": "foo", "title": "bar"}\n\`),
  es.Bulk.WithIndex("${indexName}"),
)
fmt.Println(res, err)`,
  installClient: 'go get github.com/elastic/go-elasticsearch/v8@8.8',
  name: i18n.translate('xpack.serverlessSearch.languages.go', {
    defaultMessage: 'Go',
  }),
  testConnection: `res, err := es.Info()
if err != nil {
  log.Fatalf("Error getting response: %s", err)
}

defer res.Body.Close()
fmt.Println(res)`,
};
