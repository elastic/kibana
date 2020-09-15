/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildScope, buildScopeSuggestions } from './url_drilldown_scope';

test('buildScopeSuggestions', () => {
  expect(
    buildScopeSuggestions(
      buildScope({
        globalScope: {
          kibanaUrl: 'http://localhost:5061/',
        },
        eventScope: {
          key: '__testKey__',
          value: '__testValue__',
        },
        contextScope: {
          filters: [
            {
              query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
              meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
            },
            {
              query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
              meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
            },
            {
              query: { match: { _type: { query: 'nginx', type: 'phrase' } } },
              meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
            },
          ],
          query: {
            query: '',
            language: 'kquery',
          },
        },
      })
    )
  ).toMatchInlineSnapshot(`
    Array [
      "event.key",
      "event.value",
      "context.filters",
      "context.query.language",
      "context.query.query",
      "kibanaUrl",
    ]
  `);
});
