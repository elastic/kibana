/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRequiredKbDocsTermsQueryDsl } from './get_required_kb_docs_terms_query_dsl';

const kbResource = 'esql';

describe('getRequiredKbDocsTermsQueryDsl', () => {
  it('returns the expected terms query DSL', () => {
    const result = getRequiredKbDocsTermsQueryDsl(kbResource);

    expect(result).toEqual([
      { term: { 'metadata.kbResource': 'esql' } },
      { term: { 'metadata.required': true } },
    ]);
  });
});
