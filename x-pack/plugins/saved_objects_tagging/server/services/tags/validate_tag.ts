/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagAttributes } from '../../../common/types';
import {
  TagValidation,
  validateTagColor,
  validateTagName,
  validateTagDescription,
} from '../../../common/validation';

export const validateTag = (attributes: TagAttributes): TagValidation => {
  const validation: TagValidation = {
    valid: true,
    warnings: [],
    errors: {},
  };

  validation.errors.name = validateTagName(attributes.name);
  validation.errors.color = validateTagColor(attributes.color);
  validation.errors.description = validateTagDescription(attributes.description);

  Object.values(validation.errors).forEach((error) => {
    if (error) {
      validation.valid = false;
    }
  });

  return validation;
};
