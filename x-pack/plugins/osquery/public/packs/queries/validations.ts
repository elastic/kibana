/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormData, ValidationFunc } from '../../shared_imports';

export const MAX_QUERY_LENGTH = 2000;
const idPattern = /^[a-zA-Z0-9-_]+$/;
// still used in Packs
export const idSchemaValidation: ValidationFunc<FormData, string, string> = ({ value }) => {
  const valueIsValid = idPattern.test(value);
  if (!valueIsValid) {
    return {
      message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.invalidIdError', {
        defaultMessage: 'Characters must be alphanumeric, _, or -',
      }),
    };
  }
};

export const idHookSchemaValidation = (value: string) => {
  const valueIsValid = idPattern.test(value);

  if (!valueIsValid) {
    return i18n.translate('xpack.osquery.pack.queryFlyoutForm.invalidIdError', {
      defaultMessage: 'Characters must be alphanumeric, _, or -',
    });
  }
};

const createUniqueIdValidation = (ids: Set<string>) => {
  const uniqueIdCheck = (value: string) => {
    if (ids.has(value)) {
      return i18n.translate('xpack.osquery.pack.queryFlyoutForm.uniqueIdError', {
        defaultMessage: 'ID must be unique',
      });
    }
  };

  return uniqueIdCheck;
};

export const createFormIdFieldValidations = (ids: Set<string>) => ({
  required: {
    message: i18n.translate('xpack.osquery.pack.queryFlyoutForm.emptyIdError', {
      defaultMessage: 'ID is required',
    }),
    value: true,
  },
  validate: (text: string) => {
    const isPatternValid = idHookSchemaValidation(text);
    const isUnique = createUniqueIdValidation(ids)(text);

    return isPatternValid || isUnique;
  },
});
