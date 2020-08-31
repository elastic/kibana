/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateName } from './validate_name';

describe('validateName', () => {
  describe('rejects empty input', () => {
    ['   ', undefined, null].forEach((input) => {
      test(`'${input}'`, () => {
        expect(validateName(input)).toMatchSnapshot();
      });
    });
  });

  describe('rejects invalid characters', () => {
    '!@#$%^&*()+?<> ,.'.split('').forEach((input) => {
      test(`'${input}'`, () => {
        expect(validateName(input)).toMatchSnapshot();
      });
    });
  });
});
