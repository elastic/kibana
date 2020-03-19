/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EditUser } from '../../common/model';

interface UserValidatorOptions {
  shouldValidate?: boolean;
}

export interface UserValidationResult {
  isInvalid: boolean;
  error?: string;
}

const validEmailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const validUsernameRegex = /[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*/;

export class UserValidator {
  private shouldValidate?: boolean;

  constructor(options: UserValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateUsername(username: string): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!username) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.requiredUsernameErrorMessage', {
          defaultMessage: 'Username is required',
        })
      );
    } else if (username && !username.match(validUsernameRegex)) {
      return invalid(
        i18n.translate(
          'xpack.security.management.users.editUser.usernameAllowedCharactersErrorMessage',
          {
            defaultMessage:
              'Username must begin with a letter or underscore and contain only letters, underscores, and numbers',
          }
        )
      );
    }

    return valid();
  }

  public validateEmail(email: string): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (email && !email.match(validEmailRegex)) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.validEmailRequiredErrorMessage', {
          defaultMessage: 'Email address is invalid',
        })
      );
    }
    return valid();
  }

  public validatePassword(password: string): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!password || password.length < 6) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.passwordLengthErrorMessage', {
          defaultMessage: 'Password must be at least 6 characters',
        })
      );
    }
    return valid();
  }

  public validateConfirmPassword(password: string, confirmPassword: string): UserValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (password && password !== confirmPassword) {
      return invalid(
        i18n.translate('xpack.security.management.users.editUser.passwordDoNotMatchErrorMessage', {
          defaultMessage: 'Passwords do not match',
        })
      );
    }
    return valid();
  }

  public validateForSave(user: EditUser, isNewUser: boolean): UserValidationResult {
    const { isInvalid: isUsernameInvalid } = this.validateUsername(user.username);
    const { isInvalid: isEmailInvalid } = this.validateEmail(user.email);
    let isPasswordInvalid = false;
    let isConfirmPasswordInvalid = false;

    if (isNewUser) {
      isPasswordInvalid = this.validatePassword(user.password).isInvalid;
      isConfirmPasswordInvalid = this.validateConfirmPassword(user.password, user.confirmPassword)
        .isInvalid;
    }

    if (isUsernameInvalid || isEmailInvalid || isPasswordInvalid || isConfirmPasswordInvalid) {
      return invalid();
    }

    return valid();
  }

  public validateForLogin(username: string, password: string): UserValidationResult {
    const { isInvalid: isUsernameInvalid } = this.validateUsername(username);
    const { isInvalid: isPasswordInvalid } = this.validatePassword(password);

    if (isUsernameInvalid || isPasswordInvalid) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error?: string): UserValidationResult {
  return {
    isInvalid: true,
    error,
  };
}

function valid(): UserValidationResult {
  return {
    isInvalid: false,
  };
}
