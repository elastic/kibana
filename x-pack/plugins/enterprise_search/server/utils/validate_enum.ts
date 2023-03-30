/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 *
 * @param enumToValidateAgainst enum to validate against
 * @param fieldName name of field, used for diagnostic messaging
 * @returns A validator usable in our API schema validator to validate that values adhere to the enum they're supposed to have
 */

export function validateEnum(
  enumToValidateAgainst: Record<string | number, string | number>,
  fieldName: string
) {
  return (value: string) => {
    if (!Object.values(enumToValidateAgainst).includes(value)) {
      return i18n.translate('xpack.enterpriseSearch.server.utils.invalidEnumValue', {
        defaultMessage: 'Illegal value {value} for field {fieldName}',
        values: {
          fieldName,
          value,
        },
      });
    }
  };
}
