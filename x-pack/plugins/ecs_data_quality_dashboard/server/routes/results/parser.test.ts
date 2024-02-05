/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDocumentFromResult, createResultFromDocument } from './parser';
import { resultBody, resultDocument } from './results.mock';

describe('createDocumentFromResult', () => {
  it('should create document from result', () => {
    const document = createDocumentFromResult(resultBody);
    expect(document).toEqual({ ...resultDocument, '@timestamp': expect.any(Number) });
  });
});

describe('createResultFromDocument', () => {
  it('should create document from result', () => {
    const result = createResultFromDocument(resultDocument);
    expect(result).toEqual({ ...resultBody, '@timestamp': expect.any(Number) });
  });
});
