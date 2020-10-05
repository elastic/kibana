/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagAttributes } from '../../../common';

export interface TagValidation {
  valid: boolean;
  errors?: Record<string, string>;
}

/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
export const getRandomColor = (): string => {
  return '#' + String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0');
};

export const validateTag = (tag: TagAttributes): TagValidation => {
  const validation: TagValidation = {
    valid: true,
    errors: {},
  };

  if (!tag.title.trim()) {
    validation.valid = false;
  }
  if (!tag.color) {
    validation.valid = false;
  }

  return validation;
};
