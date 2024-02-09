/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateProxy } from './validate_proxy';

describe('validateProxy', () => {
  test(`rejects proxy address when there's no input`, () => {
    expect(validateProxy(false, undefined)).toMatchSnapshot();
  });

  test(`rejects proxy address when the address is invalid`, () => {
    expect(validateProxy(false, '___')).toMatchSnapshot();
  });

  test(`rejects proxy address when the port is invalid`, () => {
    expect(validateProxy(false, 'noport')).toMatchSnapshot();
  });

  test(`accepts valid proxy address`, () => {
    expect(validateProxy(false, 'localhost:3000')).toBe(null);
  });
});
