/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { i18n } from '@kbn/i18n';
import { getRangeType } from './get_range_type';

export function getIntegerRt({
  min = -Infinity,
  max = Infinity
}: {
  min?: number;
  max?: number;
} = {}) {
  const message = i18n.translate('xpack.apm.agentConfig.integer.errorText', {
    defaultMessage: `{rangeType, select,
        between {Must be between {min} and {max}}
        gt {Must be greater than {min}}
        lt {Must be less than {max}}
        other {Must be an integer}
      }`,
    values: { min, max, rangeType: getRangeType(min, max) }
  });

  return new t.Type<string, string, unknown>(
    'integerRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), inputAsString => {
        const inputAsInt = parseInt(inputAsString, 10);
        const isValid = inputAsInt >= min && inputAsInt <= max;
        return isValid
          ? t.success(inputAsString)
          : t.failure(input, context, message);
      });
    },
    t.identity
  );
}
