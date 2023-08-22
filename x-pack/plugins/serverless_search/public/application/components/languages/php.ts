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
  advancedConfig: docLinks.phpAdvancedConfig,
  apiReference: docLinks.phpApiReference,
  basicConfig: docLinks.phpBasicConfig,
  buildSearchQuery: `$params = [
  'index' => 'books',
  'body'  => [
    'q' => 'snow'
  ]
];

$response = $client->search($params);
print_r($response->asArray());`,
  configureClient: ({ url, apiKey }) => `$client = ClientBuilder::create()
  ->setHosts(['${url}'])
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
  ingestData: `$params = [
'body' => [
[
'index' => [
'_index' => 'books',
'_id' => '9780553351927',
],
],
[
'name' => 'Snow Crash',
'author' => 'Neal Stephenson',
'release_date' => '1992-06-01',
'page_count' => 470,
],
[
'index' => [
'_index' => 'books',
'_id' => '9780441017225',
],
],
[
'name' => 'Revelation Space',
'author' => 'Alastair Reynolds',
'release_date' => '2000-03-15',
'page_count' => 585,
],
[
'index' => [
'_index' => 'books',
'_id' => '9780451524935',
],
],
[
'name' => '1984',
'author' => 'George Orwell',
'release_date' => '1985-06-01',
'page_count' => 328,
],
[
'index' => [
'_index' => 'books',
'_id' => '9781451673319',
],
],
[
'name' => 'Fahrenheit 451',
'author' => 'Ray Bradbury',
'release_date' => '1953-10-15',
'page_count' => 227,
],
[
'index' => [
'_index' => 'books',
'_id' => '9780060850524',
],
],
[
'name' => 'Brave New World',
'author' => 'Aldous Huxley',
'release_date' => '1932-06-01',
'page_count' => 268,
],
[
'index' => [
'_index' => 'books',
'_id' => '9780385490818',
],
],
[
'name' => 'The Handmaid\'s Tale',
'author' => 'Margaret Atwood',
'release_date' => '1985-06-01',
'page_count' => 311,
],
],
];

$response = $client->bulk($params);
echo $response->getStatusCode();
echo (string) $response->getBody();`,
  ingestDataIndex: ({ apiKey, url, indexName }) => `$client = ClientBuilder::create()
  ->setHosts(['${url}'])
  ->setApiKey('${apiKey}')
  ->build();

$params = [
'body' => [
[
'index' => [
'_index' => '${indexName ?? INDEX_NAME_PLACEHOLDER}',
'_id' => '1',
],
],
[
'name' => 'foo',
'title' => 'bar',
],
],
];

$response = $client->bulk($params);
echo $response->getStatusCode();
echo (string) $response->getBody();
`,
  installClient: 'composer require elasticsearch/elasticsearch',
  name: i18n.translate('xpack.serverlessSearch.languages.php', {
    defaultMessage: 'PHP',
  }),
  testConnection: `$response = $client->info();
echo $response->getStatusCode();
echo (string) $response->getBody();`,
};
