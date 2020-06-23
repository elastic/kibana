/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LoginValidator, LoginValidationResult } from './validate_login';

function expectValid(result: LoginValidationResult) {
  expect(result.isInvalid).toBe(false);
}

function expectInvalid(result: LoginValidationResult) {
  expect(result.isInvalid).toBe(true);
}

describe('LoginValidator', () => {
  describe('#validateUsername', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new LoginValidator().validateUsername(''));
    });

    it(`returns 'invalid' if username is missing`, () => {
      expectInvalid(new LoginValidator({ shouldValidate: true }).validateUsername(''));
    });

    it(`returns 'valid' for correct usernames`, () => {
      expectValid(new LoginValidator({ shouldValidate: true }).validateUsername('u'));
    });
  });

  describe('#validatePassword', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new LoginValidator().validatePassword(''));
    });

    it(`returns 'invalid' if password is missing`, () => {
      expectInvalid(new LoginValidator({ shouldValidate: true }).validatePassword(''));
    });

    it(`returns 'valid' for correct passwords`, () => {
      expectValid(new LoginValidator({ shouldValidate: true }).validatePassword('p'));
    });
  });

  describe('#validateForLogin', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new LoginValidator().validateForLogin('', ''));
    });

    it(`returns 'invalid' if username is invalid`, () => {
      expectInvalid(new LoginValidator({ shouldValidate: true }).validateForLogin('', 'p'));
    });

    it(`returns 'invalid' if password is invalid`, () => {
      expectInvalid(new LoginValidator({ shouldValidate: true }).validateForLogin('u', ''));
    });

    it(`returns 'valid' if username and password are valid`, () => {
      expectValid(new LoginValidator({ shouldValidate: true }).validateForLogin('u', 'p'));
    });
  });
});
