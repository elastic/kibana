/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RelatedIntegration } from '../../../../../common/api/detection_engine';
import type { FormData, ERROR_CODE, ValidationFunc } from '../../../../shared_imports';
import * as i18n from './translations';

export function validateRelatedIntegration(
  ...args: Parameters<ValidationFunc<FormData, string, RelatedIntegration>>
): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined {
  const [{ value, path }] = args;

  // It allows to submit empty fields for better UX
  // When integration isn't selected version shouldn't be validated
  if (value.package.trim().length === 0) {
    return;
  }

  if (value.version.trim().length === 0) {
    return {
      code: 'ERR_FIELD_MISSING',
      path: `${path}.version`,
      message: i18n.VERSION_DEPENDENCY_REQUIRED,
    };
  }

  if (!SEMVER_PATTERN.test(value.version)) {
    return {
      code: 'ERR_FIELD_FORMAT',
      path: `${path}.version`,
      message: i18n.VERSION_DEPENDENCY_INVALID,
    };
  }
}

const SEMVER_PATTERN = /^(\~|\^)?\d+\.\d+\.\d+$/;
