/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../common/doc_links';
import { LanguageDefinition, Languages } from './types';

export const javascriptDefinition: LanguageDefinition = {
  advancedConfig: docLinks.jsAdvancedConfig,
  apiReference: docLinks.jsApiReference,
  basicConfig: docLinks.jsBasicConfig,
  buildSearchQuery: `// Sample flight data
const dataset = [
{'flight': '9HY9SWR', 'price': 841.2656419677076, 'delayed': false},
{'flight': 'X98CCZO', 'price': 882.9826615595518, 'delayed': false},
{'flight': 'UFK2WIZ', 'price': 190.6369038508356, 'delayed': true},
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
total: 3,
failed: 0,
retry: 0,
successful: 3,
noop: 0,
time: 421,
bytes: 293,
aborted: false
}
*/`,
  configureClient: `const { Client } = require('@elastic/elasticsearch');
const client = Client({
node: 'https://my-deployment-url',
auth: {
    apiKey: 'your_api_key'
}
});`,
  docLink: docLinks.jsClient,
  iconType: 'javascript.svg',
  id: Languages.JAVASCRIPT,
  ingestData: `// Sample flight data
const dataset = [
{'flight': '9HY9SWR', 'price': 841.2656419677076, 'delayed': false},
{'flight': 'X98CCZO', 'price': 882.9826615595518, 'delayed': false},
{'flight': 'UFK2WIZ', 'price': 190.6369038508356, 'delayed': true},
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
total: 3,
failed: 0,
retry: 0,
successful: 3,
noop: 0,
time: 421,
bytes: 293,
aborted: false
}
*/`,
  installClient: `$ npm install @elastic/elasticsearch@8`,
  name: i18n.translate('xpack.serverlessSearch.languages.javascript', {
    defaultMessage: 'JavaScript / Node.js',
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
