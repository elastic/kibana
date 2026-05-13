/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDagreLayoutFailureDiagnostics } from './dagre_layout_failure_diagnostics';

describe('getDagreLayoutFailureDiagnostics', () => {
  it('extracts name, message, and stack head from Error', () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'weight')");
    err.stack = `TypeError: Cannot read properties of undefined (reading 'weight')
    at calcCutValue (network-simplex.js:96:10)
    at Object.layout (dagre.js:1:1)`;

    const result = getDagreLayoutFailureDiagnostics(err);

    expect(result.error_name).toBe('TypeError');
    expect(result.error_message).toContain("reading 'weight'");
    expect(result.stack_head).toContain('calcCutValue');
    expect(result.stack_head).toContain('network-simplex.js');
  });

  it('truncates a long message', () => {
    const longMessage = 'x'.repeat(400);
    const err = new Error(longMessage);

    const result = getDagreLayoutFailureDiagnostics(err);

    expect(result.error_message.length).toBeLessThanOrEqual(256);
  });

  it('handles non-Error throws', () => {
    const result = getDagreLayoutFailureDiagnostics('string failure');

    expect(result).toEqual({
      error_name: 'unknown',
      error_message: 'string failure',
      stack_head: '',
    });
  });
});
