/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isValidUrlContext } from './url_context_utils';
import { isReservedSpace } from '../../../../common/is_reserved_space';

export class SpaceValidator {
  constructor(options = {}) {
    this._shouldValidate = options.shouldValidate;
  }

  enableValidation() {
    this._shouldValidate = true;
  }

  disableValidation() {
    this._shouldValidate = false;
  }

  validateSpaceName(space) {
    if (!this._shouldValidate) return valid();

    if (!space.name) {
      return invalid(`Please provide a space name`);
    }

    if (space.name.length > 1024) {
      return invalid(`Name must not exceed 1024 characters`);
    }

    return valid();
  }

  validateSpaceDescription(space) {
    if (!this._shouldValidate) return valid();

    if (!space.description) {
      return invalid(`Please provide a space description`);
    }

    return valid();
  }

  validateUrlContext(space) {
    if (!this._shouldValidate) return valid();

    if (isReservedSpace(space)) return valid();

    if (!space.urlContext) {
      return invalid(`URL Context is required`);
    }

    if (!isValidUrlContext(space.urlContext)) {
      return invalid('URL Context only allows a-z, 0-9, and the "-" character');
    }

    return valid();
  }

  validateForSave(space) {
    const { isInvalid: isNameInvalid } = this.validateSpaceName(space);
    const { isInvalid: isDescriptionInvalid } = this.validateSpaceDescription(space);
    const { isInvalid: isContextInvalid } = this.validateUrlContext(space);

    if (isNameInvalid || isDescriptionInvalid || isContextInvalid) {
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
