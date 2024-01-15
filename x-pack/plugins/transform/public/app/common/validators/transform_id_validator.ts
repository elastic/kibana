/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Validator } from '@kbn/ml-form-utils/validator';

import { requiredErrorMessage } from './messages';

// Via https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/transform/utils/TransformStrings.java#L24
// Matches a string that contains lowercase characters, digits, hyphens, underscores or dots.
// The string may start and end only in characters or digits.
// Note that '.' is allowed but not documented.
export function isTransformIdValid(transformId: string) {
  return /^[a-z0-9](?:[a-z0-9_\-\.]*[a-z0-9])?$/g.test(transformId);
}

export const transformIdValidator: Validator = (value, isOptional = true, reservedValues = []) => {
  if (typeof value !== 'string' || !isTransformIdValid(value)) {
    return [
      i18n.translate('xpack.transform.stepDetailsForm.transformIdInvalidError', {
        defaultMessage:
          'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
      }),
    ];
  }

  if (reservedValues.some((v) => value === v)) {
    return [
      i18n.translate('xpack.transform.stepDetailsForm.transformIdExistsError', {
        defaultMessage: 'A transform with this ID already exists.',
      }),
    ];
  }

  if (value.length === 0 && !isOptional) {
    return [requiredErrorMessage];
  }

  return [];
};
