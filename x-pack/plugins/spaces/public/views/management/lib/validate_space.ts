/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Feature } from 'x-pack/plugins/xpack_main/types';
import { isReservedSpace } from '../../../../common/is_reserved_space';
import { Space } from '../../../../common/model/space';
import { isValidSpaceIdentifier } from './space_identifier_utils';

interface SpaceValidatorOptions {
  features: Feature[];
  shouldValidate?: boolean;
}

export class SpaceValidator {
  private shouldValidate: boolean;
  private featureIds: string[];

  constructor(options: SpaceValidatorOptions) {
    this.shouldValidate = options.shouldValidate || false;
    this.featureIds = options.features.map(feature => feature.id);
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateSpaceName(space: Partial<Space>) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!space.name || !space.name.trim()) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredNameErrorMessage', {
          defaultMessage: 'Name is required',
        })
      );
    }

    if (space.name.length > 1024) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.nameMaxLengthErrorMessage', {
          defaultMessage: 'Name must not exceed 1024 characters',
        })
      );
    }

    return valid();
  }

  public validateSpaceDescription(space: Partial<Space>) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.description && space.description.length > 2000) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.describeMaxLengthErrorMessage', {
          defaultMessage: 'Description must not exceed 2000 characters',
        })
      );
    }

    return valid();
  }

  public validateURLIdentifier(space: Partial<Space>) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (isReservedSpace(space)) {
      return valid();
    }

    if (!space.id) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.urlIdentifierRequiredErrorMessage', {
          defaultMessage: 'URL identifier is required',
        })
      );
    }

    if (!isValidSpaceIdentifier(space.id)) {
      return invalid(
        i18n.translate(
          'xpack.spaces.management.validateSpace.urlIdentifierAllowedCharactersErrorMessage',
          {
            defaultMessage:
              'URL identifier can only contain a-z, 0-9, and the characters "_" and "-"',
          }
        )
      );
    }

    return valid();
  }

  public validateEnabledFeatures(space: Partial<Space>) {
    if (!this.shouldValidate) {
      return valid();
    }

    const knownDisabledFeatures = (space.disabledFeatures || []).filter(id =>
      this.featureIds.includes(id)
    );

    const totalFeatureCount = this.featureIds.length;

    if (knownDisabledFeatures.length === totalFeatureCount) {
      return invalid(`At least 1 feature must be enabled`);
    }
    return valid();
  }

  public validateForSave(space: Space) {
    const { isInvalid: isNameInvalid } = this.validateSpaceName(space);
    const { isInvalid: isDescriptionInvalid } = this.validateSpaceDescription(space);
    const { isInvalid: isIdentifierInvalid } = this.validateURLIdentifier(space);
    const { isInvalid: areFeaturesInvalid } = this.validateEnabledFeatures(space);

    if (isNameInvalid || isDescriptionInvalid || isIdentifierInvalid || areFeaturesInvalid) {
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
