/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRetriever } from './routes';

describe('createRetriever', () => {
  test('works when the question has quotes', () => {
    const esQuery = '{"query": {"match": {"text": "{query}"}}}';
    const question = 'How can I "do something" with quotes?';

    const retriever = createRetriever(esQuery);
    const result = retriever(question);

    expect(result).toEqual({ match: { text: 'How can I "do something" with quotes?' } });
  });
});
