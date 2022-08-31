/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensurePatternFormat } from './sourcerer';

describe('ensurePatternFormat', () => {
  test('remove duplicate patterns', () => {
    const result = ensurePatternFormat(['auditbeat-*', 'auditbeat-*']);
    expect(result).toEqual(['auditbeat-*']);
  });

  test('sort patterns start with - at the back', () => {
    const result = ensurePatternFormat(['-logs-*', 'auditbeat-*']);
    expect(result).toEqual(['auditbeat-*', '-logs-*']);
  });
});
