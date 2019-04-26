/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseBooleanParam } from '../parse_boolean_param';

describe('parseBooleanParam', () => {
  it('parses correct true isPaused value', () => {
    expect(parseBooleanParam('true', false)).toEqual(true);
  });

  it('parses correct false isPaused value', () => {
    expect(parseBooleanParam('false', true)).toEqual(false);
  });

  it('uses default value for non-boolean string', () => {
    expect(parseBooleanParam('foo', true)).toEqual(true);
  });
});
