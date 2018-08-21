/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class RoleValidator {
  constructor(options = {}) {
    this._shouldValidate = options.shouldValidate;
    this._inProgressSpacePrivileges = [];
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

    if (!Array.isArray(role.elasticsearch.indices)) {
      throw new TypeError(`Expected role.elasticsearch.indices to be an array`);
    }

    const areIndicesValid = role.elasticsearch.indices
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

  validateSelectedSpaces(spaceIds, privilege) {
    if (!this._shouldValidate) return valid();

    // If no assigned privilege, then no spaces are OK
    if (!privilege) return valid();

    if (Array.isArray(spaceIds) && spaceIds.length > 0) {
      return valid();
    }
    return invalid('At least one space is required');
  }

  validateSelectedPrivilege(spaceIds, privilege) {
    if (!this._shouldValidate) return valid();

    // If no assigned spaces, then a missing privilege is OK
    if (!spaceIds || spaceIds.length === 0) return valid();

    if (privilege) {
      return valid();
    }
    return invalid('Privilege is required');
  }

  setInProgressSpacePrivileges(inProgressSpacePrivileges) {
    this._inProgressSpacePrivileges = [...inProgressSpacePrivileges];
  }

  validateInProgressSpacePrivileges(role) {
    const { global } = role.kibana;

    // A Global privilege of "all" will ignore all in progress privileges,
    // so the form should not block saving in this scenario.
    const shouldValidate = this._shouldValidate && !global.includes('all');

    if (!shouldValidate) return valid();

    const allInProgressValid = this._inProgressSpacePrivileges.every(({ spaces, privilege }) => {
      return !this.validateSelectedSpaces(spaces, privilege).isInvalid
        && !this.validateSelectedPrivilege(spaces, privilege).isInvalid;
    });

    if (allInProgressValid) {
      return valid();
    }
    return invalid();
  }

  validateSpacePrivileges(role) {
    if (!this._shouldValidate) return valid();

    const privileges = Object.values(role.kibana.space || {});

    const arePrivilegesValid = privileges.every(assignedPrivilege => !!assignedPrivilege);
    const areInProgressPrivilegesValid = !this.validateInProgressSpacePrivileges(role).isInvalid;

    if (arePrivilegesValid && areInProgressPrivilegesValid) {
      return valid();
    }
    return invalid();
  }

  validateForSave(role) {
    const { isInvalid: isNameInvalid } = this.validateRoleName(role);
    const { isInvalid: areIndicesInvalid } = this.validateIndexPrivileges(role);
    const { isInvalid: areSpacePrivilegesInvalid } = this.validateSpacePrivileges(role);

    if (isNameInvalid || areIndicesInvalid || areSpacePrivilegesInvalid) {
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

