/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. ../../../../../common/model/index_privileger one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPrivilege } from '../../../../../common/model/index_privilege';
import { KibanaPrivilege } from '../../../../../common/model/kibana_privilege';
import { Role } from '../../../../../common/model/role';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface RoleValidatorOptions {
  shouldValidate?: boolean;
}

export interface RoleValidationResult {
  isInvalid: boolean;
  error?: string;
}

export class RoleValidator {
  private shouldValidate?: boolean;

  private inProgressSpacePrivileges: any[] = [];

  constructor(options: RoleValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateRoleName(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!role.name) {
      return invalid(`Please provide a role name`);
    }
    if (role.name.length > 1024) {
      return invalid(`Name must not exceed 1024 characters`);
    }
    if (!role.name.match(/^[a-zA-Z_][a-zA-Z0-9_@\-\$\.]*$/)) {
      return invalid(
        `Name must begin with a letter or underscore and contain only letters, underscores, and numbers.`
      );
    }
    return valid();
  }

  public validateIndexPrivileges(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!Array.isArray(role.elasticsearch.indices)) {
      throw new TypeError(`Expected role.elasticsearch.indices to be an array`);
    }

    const areIndicesValid =
      role.elasticsearch.indices
        .map(indexPriv => this.validateIndexPrivilege(indexPriv))
        .find((result: RoleValidationResult) => result.isInvalid) == null;

    if (areIndicesValid) {
      return valid();
    }
    return invalid();
  }

  public validateIndexPrivilege(indexPrivilege: IndexPrivilege): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    if (indexPrivilege.names.length && !indexPrivilege.privileges.length) {
      return invalid(`At least one privilege is required`);
    }
    return valid();
  }

  public validateSelectedSpaces(
    spaceIds: string[],
    privilege: KibanaPrivilege | null
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // If no assigned privilege, then no spaces are OK
    if (!privilege) {
      return valid();
    }

    if (Array.isArray(spaceIds) && spaceIds.length > 0) {
      return valid();
    }
    return invalid('At least one space is required');
  }

  public validateSelectedPrivilege(
    spaceIds: string[],
    privilege: KibanaPrivilege | null
  ): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    // If no assigned spaces, then a missing privilege is OK
    if (!spaceIds || spaceIds.length === 0) {
      return valid();
    }

    if (privilege) {
      return valid();
    }
    return invalid('Privilege is required');
  }

  public setInProgressSpacePrivileges(inProgressSpacePrivileges: any[]) {
    this.inProgressSpacePrivileges = [...inProgressSpacePrivileges];
  }

  public validateInProgressSpacePrivileges(role: Role): RoleValidationResult {
    const { global } = role.kibana;

    // A Global privilege of "all" will ignore all in progress privileges,
    // so the form should not block saving in this scenario.
    const shouldValidate = this.shouldValidate && !global.includes('all');

    if (!shouldValidate) {
      return valid();
    }

    const allInProgressValid = this.inProgressSpacePrivileges.every(({ spaces, privilege }) => {
      return (
        !this.validateSelectedSpaces(spaces, privilege).isInvalid &&
        !this.validateSelectedPrivilege(spaces, privilege).isInvalid
      );
    });

    if (allInProgressValid) {
      return valid();
    }
    return invalid();
  }

  public validateSpacePrivileges(role: Role): RoleValidationResult {
    if (!this.shouldValidate) {
      return valid();
    }

    const privileges = Object.values(role.kibana.space || {});

    const arePrivilegesValid = privileges.every(assignedPrivilege => !!assignedPrivilege);
    const areInProgressPrivilegesValid = !this.validateInProgressSpacePrivileges(role).isInvalid;

    if (arePrivilegesValid && areInProgressPrivilegesValid) {
      return valid();
    }
    return invalid();
  }

  public validateForSave(role: Role): RoleValidationResult {
    const { isInvalid: isNameInvalid } = this.validateRoleName(role);
    const { isInvalid: areIndicesInvalid } = this.validateIndexPrivileges(role);
    const { isInvalid: areSpacePrivilegesInvalid } = this.validateSpacePrivileges(role);

    if (isNameInvalid || areIndicesInvalid || areSpacePrivilegesInvalid) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error?: string): RoleValidationResult {
  return {
    isInvalid: true,
    error,
  };
}

function valid(): RoleValidationResult {
  return {
    isInvalid: false,
  };
}
