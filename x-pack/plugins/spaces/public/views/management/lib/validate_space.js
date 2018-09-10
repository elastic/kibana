/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isValidSpaceIdentifier } from './space_identifier_utils';
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
      return invalid(`Name is required`);
    }

    if (space.name.length > 1024) {
      return invalid(`Name must not exceed 1024 characters`);
    }

    return valid();
  }

  validateSpaceDescription(space) {
    if (!this._shouldValidate) return valid();

    if (space.description && space.description.length > 2000) {
      return invalid(`Description must not exceed 2000 characters`);
    }

    return valid();
  }

  validateURLIdentifier(space) {
    if (!this._shouldValidate) return valid();

    if (isReservedSpace(space)) return valid();

    if (!space.id) {
      return invalid(`URL identifier is required`);
    }

    if (!isValidSpaceIdentifier(space.id)) {
      return invalid('URL identifier can only contain a-z, 0-9, and the characters "_" and "-"');
    }

    return valid();
  }

  validateForSave(space) {
    const { isInvalid: isNameInvalid } = this.validateSpaceName(space);
    const { isInvalid: isDescriptionInvalid } = this.validateSpaceDescription(space);
    const { isInvalid: isIdentifierInvalid } = this.validateURLIdentifier(space);

    if (isNameInvalid || isDescriptionInvalid || isIdentifierInvalid) {
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
