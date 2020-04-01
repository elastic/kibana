/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SimpleQuery } from '../../../../common';

import { getSourceIndexDevConsoleStatement } from './common';

describe('Transform: Source Index Preview Common', () => {
  test('getSourceIndexDevConsoleStatement()', () => {
    const query: SimpleQuery = {
      query_string: {
        query: '*',
        default_operator: 'AND',
      },
    };
    const sourceIndexPreviewDevConsoleStatement = getSourceIndexDevConsoleStatement(
      query,
      'the-index-pattern-title'
    );

    expect(sourceIndexPreviewDevConsoleStatement).toBe(`GET the-index-pattern-title/_search
{
  "query": {
    "query_string": {
      "query": "*",
      "default_operator": "AND"
    }
  }
}
`);
  });
});
