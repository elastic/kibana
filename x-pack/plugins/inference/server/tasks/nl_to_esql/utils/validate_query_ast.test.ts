/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQueryAst } from './validate_query_ast';

describe('validateQueryAst', () => {
  it('returns AST validation errors', async () => {
    const query = `FROM kibana_sample_data_logs
    | KOUKOU foobar
    | WHERE`;

    const errors = await validateQueryAst(query);

    expect(errors).toEqual([
      {
        startPos: 36,
        endPos: 42,
        message: expect.stringContaining(`mismatched input 'KOUKOU'`),
      },
      {
        startPos: 61,
        endPos: 61,
        message: expect.stringContaining(`mismatched input '<EOF>'`),
      },
    ]);
  });
});
