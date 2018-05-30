/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class RoleValidator {
  constructor(options = {}) {
    this._shouldValidate = options.shouldValidate;
  }

  enableValidation() {
    this._shouldValidate = true;
  }

  disableValidation() {
    this._shouldValidate = false;
  }

  validateRoleName(role) {
    if (!this._shouldValidate) return valid();

    if (!role.name) {
      return invalid(`Please provide a role name`);
    }
    if (role.name.length > 1024) {
      return invalid(`Name must not exceed 1024 characters`);
    }
    if (!role.name.match(/^[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*$/)) {
      return invalid(`Name must begin with a letter or underscore and contain only letters, underscores, and numbers.`);
    }
    return valid();
  }

  validateIndexPrivileges(role) {
    if (!this._shouldValidate) return valid();

    if (!Array.isArray(role.indices)) {
      throw new TypeError(`Expected role.indices to be an array`);
    }

    const areIndicesValid = role.indices
      .map(this.validateIndexPrivilege.bind(this))
      .find((result) => result.isInvalid) == null;

    if (areIndicesValid) {
      return valid();
    }
    return invalid();
  }

  validateIndexPrivilege(indexPrivilege) {
    if (!this._shouldValidate) return valid();

    if (indexPrivilege.names.length && !indexPrivilege.privileges.length) {
      return invalid(`At least one privilege is required`);
    }
    return valid();
  }

  validateForSave(role) {
    const { isInvalid: isNameInvalid } = this.validateRoleName(role);
    const { isInvalid: areIndicesInvalid } = this.validateIndexPrivileges(role);

    if (isNameInvalid || areIndicesInvalid) {
      return invalid();
    }

    return valid();
  }

}

function invalid(error) {
  return {
    isInvalid: true,
    error
  };
}

function valid() {
  return {
    isInvalid: false
  };
}

