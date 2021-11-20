/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIsPaused } from './parse_is_paused';

describe('parseIsPaused', () => {
  it('parses correct true isPaused value', () => {
    expect(parseIsPaused('true', false)).toEqual(true);
  });

  it('parses correct false isPaused value', () => {
    expect(parseIsPaused('false', true)).toEqual(false);
  });

  it('uses default value for non-boolean string', () => {
    expect(parseIsPaused('foo', true)).toEqual(true);
  });
});
