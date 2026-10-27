/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsqlStrict } from './parse_esql_strict';

describe('parseEsqlStrict', () => {
  it('returns parsed: true with the root AST for valid ES|QL', () => {
    const result = parseEsqlStrict('FROM logs | WHERE message == "timeout"');

    expect(result.parsed).toBe(true);
    if (result.parsed) {
      expect(result.root.commands).toBeDefined();
    }
  });

  it('returns parsed: false with the parser error messages for recoverably malformed ES|QL', () => {
    const result = parseEsqlStrict('FROM logs | WHERE "unterminated');

    expect(result.parsed).toBe(false);
    if (!result.parsed) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some((message) => typeof message === 'string' && message.length > 0)
      ).toBe(true);
    }
  });

  it('rejects ES|QL that only parses because of error recovery', () => {
    const result = parseEsqlStrict('FROM logs | STATS n = COUNT(*) bogus command');

    if (result.parsed) {
      fail('Expected strict parse to reject a query with trailing garbage');
    }
  });

  it('preserves every parser error message', () => {
    const result = parseEsqlStrict('FROM | |');

    expect(result.parsed).toBe(false);
    if (!result.parsed) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
