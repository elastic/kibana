/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidHex } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { isReservedSpace } from '../../../common/is_reserved_space';
import type { FormValues } from '../edit_space/manage_space_page';
import { isValidSpaceIdentifier } from './space_identifier_utils';

interface SpaceValidatorOptions {
  shouldValidate?: boolean;
}

export class SpaceValidator {
  private shouldValidate: boolean;

  constructor(options: SpaceValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate || false;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateSpaceName(space: FormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!space.name || !space.name.trim()) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredNameErrorMessage', {
          defaultMessage: 'Enter a name.',
        })
      );
    }

    if (space.name.length > 1024) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.nameMaxLengthErrorMessage', {
          defaultMessage: 'Name must not exceed 1024 characters.',
        })
      );
    }

    return valid();
  }

  public validateSpaceDescription(space: FormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.description && space.description.length > 2000) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.describeMaxLengthErrorMessage', {
          defaultMessage: 'Description must not exceed 2000 characters.',
        })
      );
    }

    return valid();
  }

  public validateURLIdentifier(space: FormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (isReservedSpace(space)) {
      return valid();
    }

    if (!space.id) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.urlIdentifierRequiredErrorMessage', {
          defaultMessage: 'Enter a URL identifier.',
        })
      );
    }

    if (!isValidSpaceIdentifier(space.id)) {
      return invalid(
        i18n.translate(
          'xpack.spaces.management.validateSpace.urlIdentifierAllowedCharactersErrorMessage',
          {
            defaultMessage:
              'URL identifier can only contain a-z, 0-9, and the characters "_" and "-".',
          }
        )
      );
    }

    return valid();
  }

  public validateAvatarInitials(space: FormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.avatarType !== 'image') {
      if (!space.initials) {
        return invalid(
          i18n.translate('xpack.spaces.management.validateSpace.requiredInitialsErrorMessage', {
            defaultMessage: 'Enter initials.',
          })
        );
      }
      if (space.initials.length > 2) {
        return invalid(
          i18n.translate('xpack.spaces.management.validateSpace.maxLengthInitialsErrorMessage', {
            defaultMessage: 'Enter no more than 2 characters.',
          })
        );
      }
    }

    return valid();
  }

  public validateAvatarColor(space: FormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!space.color) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredColorErrorMessage', {
          defaultMessage: 'Select a background color.',
        })
      );
    }

    if (!isValidHex(space.color)) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.invalidColorErrorMessage', {
          defaultMessage: 'Enter a valid HEX color code.',
        })
      );
    }

    return valid();
  }

  public validateAvatarImage(space: FormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.avatarType === 'image' && !space.imageUrl) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredImageErrorMessage', {
          defaultMessage: 'Upload an image.',
        })
      );
    }

    return valid();
  }

  public validateEnabledFeatures(space: FormValues) {
    return valid();
  }

  public validateForSave(space: FormValues) {
    const { isInvalid: isNameInvalid } = this.validateSpaceName(space);
    const { isInvalid: isDescriptionInvalid } = this.validateSpaceDescription(space);
    const { isInvalid: isIdentifierInvalid } = this.validateURLIdentifier(space);
    const { isInvalid: isAvatarInitialsInvalid } = this.validateAvatarInitials(space);
    const { isInvalid: isAvatarColorInvalid } = this.validateAvatarColor(space);
    const { isInvalid: isAvatarImageInvalid } = this.validateAvatarImage(space);
    const { isInvalid: areFeaturesInvalid } = this.validateEnabledFeatures(space);

    if (
      isNameInvalid ||
      isDescriptionInvalid ||
      isIdentifierInvalid ||
      isAvatarInitialsInvalid ||
      isAvatarColorInvalid ||
      isAvatarImageInvalid ||
      areFeaturesInvalid
    ) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error: string = '') {
  return {
    isInvalid: true,
    error,
  };
}

function valid() {
  return {
    isInvalid: false,
  };
}
