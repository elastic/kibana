/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexWithWithAlias } from './ilm';

test('get index with alias', () => {
  const aliasName = 'bar';

  const data = getIndexWithWithAlias(aliasName);
  // Verifies that the bar key exists and write index is set to true
  expect(data.aliases.bar.is_write_index).toStrictEqual(true);
});
