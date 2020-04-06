/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStream } from './agent';

test('Test creating a stream from template', () => {
  const streamTemplate = `
input: log
paths:
{{#each paths}}
  - {{this}}
{{/each}}
exclude_files: [".gz$"]
processors:
  - add_locale: ~
  `;
  const vars = {
    paths: ['/usr/local/var/log/nginx/access.log'],
  };

  const output = createStream(vars, streamTemplate);

  expect(output).toBe(`
input: log
paths:
  - /usr/local/var/log/nginx/access.log
exclude_files: [".gz$"]
processors:
  - add_locale: ~
  `);
});
