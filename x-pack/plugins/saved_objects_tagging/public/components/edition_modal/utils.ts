/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import {
  TagAttributes,
  TagValidation,
  validateTagColor,
  validateTagName,
  validateTagDescription,
} from '../../../common';

/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
export const getRandomColor = (): string => {
  return '#' + String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0');
};

export const duplicateTagNameErrorMessage = i18n.translate(
  'xpack.savedObjectsTagging.validation.name.duplicateError',
  {
    defaultMessage: 'Name has already been taken.',
  }
);

export const managedTagConflictMessage = i18n.translate(
  'xpack.savedObjectsTagging.validation.name.managedTagDuplicateError',
  {
    defaultMessage: 'This name belongs to a tag managed by Elastic.',
  }
);

export const validateTag = (tag: TagAttributes): TagValidation => {
  const validation: TagValidation = {
    valid: true,
    warnings: [],
    errors: {},
  };

  validation.errors.name = validateTagName(tag.name);
  validation.errors.color = validateTagColor(tag.color);
  validation.errors.description = validateTagDescription(tag.description);

  Object.values(validation.errors).forEach((error) => {
    if (error) {
      validation.valid = false;
    }
  });

  return validation;
};

export const useIfMounted = () => {
  const isMounted = useRef(true);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  const ifMounted = useCallback((func?: () => void) => {
    if (isMounted.current && func) {
      func();
    }
  }, []);

  return ifMounted;
};
