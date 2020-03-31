/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

interface LoginValidatorOptions {
  shouldValidate?: boolean;
}

export interface LoginValidationResult {
  isInvalid: boolean;
  error?: string;
}

export class LoginValidator {
  private shouldValidate?: boolean;

  constructor(options: LoginValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateUsername(username: string): LoginValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!username) {
      // Elasticsearch has more stringent requirements for usernames in the Native realm. However, the login page is used for other realms,
      // such as LDAP and Active Directory. Because of that, the best validation we can do here is to ensure the username is not empty.
      return invalid(
        i18n.translate(
          'xpack.security.authentication.login.validateLogin.requiredUsernameErrorMessage',
          {
            defaultMessage: 'Username is required',
          }
        )
      );
    }

    return valid();
  }

  public validatePassword(password: string): LoginValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!password) {
      // Elasticsearch has more stringent requirements for passwords in the Native realm. However, the login page is used for other realms,
      // such as LDAP and Active Directory. Because of that, the best validation we can do here is to ensure the password is not empty.
      return invalid(
        i18n.translate(
          'xpack.security.authentication.login.validateLogin.requiredPasswordErrorMessage',
          {
            defaultMessage: 'Password is required',
          }
        )
      );
    }
    return valid();
  }

  public validateForLogin(username: string, password: string): LoginValidationResult {
    const { isInvalid: isUsernameInvalid } = this.validateUsername(username);
    const { isInvalid: isPasswordInvalid } = this.validatePassword(password);

    if (isUsernameInvalid || isPasswordInvalid) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error?: string): LoginValidationResult {
  return {
    isInvalid: true,
    error,
  };
}

function valid(): LoginValidationResult {
  return {
    isInvalid: false,
  };
}
