/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UserValidator, UserValidationResult } from './validate_user';
import { EditUser } from '../../common/model';

function expectValid(result: UserValidationResult) {
  expect(result.isInvalid).toBe(false);
}

function expectInvalid(result: UserValidationResult) {
  expect(result.isInvalid).toBe(true);
}

describe('UserValidator', () => {
  describe('#validateUsername', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateUsername(''));
    });

    it(`returns 'invalid' if username is missing`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validateUsername(''));
    });

    it(`returns 'invalid' if username contains invalid characters`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validateUsername('!@#$%^&*()'));
    });

    it(`returns 'valid' for correct usernames`, () => {
      expectValid(new UserValidator({ shouldValidate: true }).validateUsername('my_user'));
    });
  });

  describe('#validateEmail', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateEmail(''));
    });

    it(`returns 'valid' if email is missing`, () => {
      expectValid(new UserValidator({ shouldValidate: true }).validateEmail(''));
    });

    it(`returns 'invalid' for invalid emails`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validateEmail('asf'));
    });

    it(`returns 'valid' for correct emails`, () => {
      expectValid(new UserValidator({ shouldValidate: true }).validateEmail('foo@bar.co'));
    });
  });

  describe('#validatePassword', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validatePassword(''));
    });

    it(`returns 'invalid' if password is missing`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validatePassword(''));
    });

    it(`returns 'invalid' for invalid password`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validatePassword('short'));
    });

    it(`returns 'valid' for correct passwords`, () => {
      expectValid(new UserValidator({ shouldValidate: true }).validatePassword('changeme'));
    });
  });

  describe('#validateConfirmPassword', () => {
    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateConfirmPassword('changeme', ''));
    });

    it(`returns 'invalid' if confirm password is missing`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validateConfirmPassword('changeme', '')
      );
    });

    it(`returns 'invalid' for mismatched passwords`, () => {
      expectInvalid(
        new UserValidator({ shouldValidate: true }).validateConfirmPassword('changeme', 'changeyou')
      );
    });

    it(`returns 'valid' for correct passwords`, () => {
      expectValid(
        new UserValidator({ shouldValidate: true }).validateConfirmPassword('changeme', 'changeme')
      );
    });
  });

  describe('#validateForSave', () => {
    const validUser = {
      username: 'my_user',
      email: 'foo@bar.co',
      password: 'changeme',
      confirmPassword: 'changeme',
      full_name: 'john smith',
      roles: [],
      enabled: true,
    } as EditUser;

    describe('isNewUser = false', () => {
      it(`returns 'valid' if validation is disabled`, () => {
        const user = { ...validUser, username: '' };
        expectValid(new UserValidator().validateForSave(user, false));
      });

      it(`returns 'invalid' if username is invalid`, () => {
        const user = { ...validUser, username: '' };
        expectInvalid(new UserValidator({ shouldValidate: true }).validateForSave(user, false));
      });

      it(`returns 'invalid' if email is invalid`, () => {
        const user = { ...validUser, email: 'asf' };
        expectInvalid(new UserValidator({ shouldValidate: true }).validateForSave(user, false));
      });

      it(`returns 'valid' if username and email are valid`, () => {
        expectValid(new UserValidator({ shouldValidate: true }).validateForSave(validUser, false));
      });
    });

    describe('isNewUser = true', () => {
      it(`returns 'valid' if validation is disabled`, () => {
        const user = { ...validUser, username: '' };
        expectValid(new UserValidator().validateForSave(user, true));
      });

      it(`returns 'invalid' if username is invalid`, () => {
        const user = { ...validUser, username: '' };
        expectInvalid(new UserValidator({ shouldValidate: true }).validateForSave(user, true));
      });

      it(`returns 'invalid' if email is invalid`, () => {
        const user = { ...validUser, email: 'asf' };
        expectInvalid(new UserValidator({ shouldValidate: true }).validateForSave(user, true));
      });

      it(`returns 'invalid' if password is invalid`, () => {
        const user = { ...validUser, password: '' };
        expectInvalid(new UserValidator({ shouldValidate: true }).validateForSave(user, true));
      });

      it(`returns 'invalid' if confirmPassword is invalid`, () => {
        const user = { ...validUser, confirmPassword: '' };
        expectInvalid(new UserValidator({ shouldValidate: true }).validateForSave(user, true));
      });

      it(`returns 'valid' if username, email, password, and confirmPassword are valid`, () => {
        expectValid(new UserValidator({ shouldValidate: true }).validateForSave(validUser, true));
      });
    });
  });

  describe('#validateForLogin', () => {
    const username = 'my_user';
    const password = 'changeme';

    it(`returns 'valid' if validation is disabled`, () => {
      expectValid(new UserValidator().validateForLogin('', ''));
    });

    it(`returns 'invalid' if username is invalid`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validateForLogin('', password));
    });

    it(`returns 'invalid' if email is invalid`, () => {
      expectInvalid(new UserValidator({ shouldValidate: true }).validateForLogin(username, ''));
    });

    it(`returns 'valid' if username and email are valid`, () => {
      expectValid(new UserValidator({ shouldValidate: true }).validateForLogin(username, password));
    });
  });
});
