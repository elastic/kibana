/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Validator } from '@kbn/ml-form-utils/validator';

import { isValidIndexName } from '../../../../common/utils/es_utils';

import { requiredErrorMessage } from './messages';

export const indexNameValidator: Validator = (value, isOptional = true, reservedValues = []) => {
  if (typeof value !== 'string' || !isValidIndexName(value)) {
    return [
      i18n.translate('xpack.transform.validator.indexNameInvalidError', {
        defaultMessage: 'Invalid index name.',
      }),
    ];
  }

  if (value.length === 0 && !isOptional) {
    return [requiredErrorMessage];
  }

  return [];
};
