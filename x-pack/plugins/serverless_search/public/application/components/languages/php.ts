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

export const phpDefinition: LanguageDefinition = {
  apiReference: docLinks.phpApiReference,
  basicConfig: docLinks.phpBasicConfig,
  buildSearchQuery: `$params = [ 'q' => 'snow' ];
  $response = $client->search(index: "books", params: $params);
  print_r($response['hits']['hits']); # list of books`,
  configureClient: ({ url, apiKey }) => `$client = ClientBuilder::create()
  ->setEndpoint('${url}')
  ->setApiKey('${apiKey}')
  ->build();`,
  docLink: docLinks.phpClient,
  github: {
    link: 'https://github.com/elastic/elasticsearch-serverless-php',
    label: i18n.translate('xpack.serverlessSearch.languages.php.githubLink', {
      defaultMessage: 'elasticsearch-serverless-php',
    }),
  },
  iconType: 'php.svg',
  id: Languages.PHP,
  ingestData: `$body = [
    [ "index" => [ "_index" => "books" ]],
    [ "name" => "Snow Crash", "author" => "Neal Stephenson", "release_date" => "1992-06-01", "page_count" => 470],
    [ "index" => [ "_index" => "books" ]],
    [ "name" => "Revelation Space", "author" => "Alastair Reynolds", "release_date" => "2000-03-15", "page_count" => 585],
    [ "index" => [ "_index" => "books" ]],
    [ "name" => "1984", "author" => "George Orwell", "release_date" => "1949-06-08", "page_count" => 328],
    [ "index" => [ "_index" => "books" ]],
    [ "name" => "Fahrenheit 451", "author" => "Ray Bradbury", "release_date" => "1953-10-15", "page_count" => 227],
    [ "index" => [ "_index" => "books" ]],
    [ "name" => "Brave New World", "author" => "Aldous Huxley", "release_date" => "1932-06-01", "page_count" => 268],
    [ "index" => [ "_index" => "books" ]],
    [ "name" => "The Handmaid's Tale", "author" => "Margaret Atwood", "release_date" => "1985-06-01", "page_count" => 311]
];

$response = $client->bulk(body: $body);
echo $response->getStatusCode();
echo (string) $response->getBody();`,
  ingestDataIndex: ({ apiKey, url, indexName }) => `$client = ClientBuilder::create()
  ->setEndpoint('${url}')
  ->setApiKey('${apiKey}')
  ->build();

$body = [
  [ 'index' => [ '_index' => '${indexName ?? INDEX_NAME_PLACEHOLDER}', '_id' => '1' ]],
  [ 'name' => 'foo', 'title' => 'bar' ]
];

$response = $client->bulk(body: $body);
echo $response->getStatusCode();
echo (string) $response->getBody();
`,
  installClient: 'composer require elastic/elasticsearch-serverless:*@alpha',
  name: i18n.translate('xpack.serverlessSearch.languages.php', {
    defaultMessage: 'PHP',
  }),
  testConnection: `$response = $client->info();
echo $response->getStatusCode();
echo (string) $response->getBody();`,
};
