/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import moment, { unitOfTime } from 'moment';
import { i18n } from '@kbn/i18n';
import { amountAndUnitToObject } from '../amount_and_unit';
import { getRangeType } from './get_range_type';

function getDuration({ amount, unit }: { amount: string; unit: string }) {
  return moment.duration(parseInt(amount, 10), unit as unitOfTime.Base);
}

export function getDurationRt({
  min,
  max,
  units
}: {
  min?: string;
  max?: string;
  units: string[];
}) {
  const minAmountAndUnit = min && amountAndUnitToObject(min);
  const maxAmountAndUnit = max && amountAndUnitToObject(max);

  const message = i18n.translate('xpack.apm.agentConfig.duration.errorText', {
    defaultMessage: `{rangeType, select,
      between {Must be between {min} and {max}}
      gt {Must be greater than {min}}
      lt {Must be less than {max}}
      other {Must be an integer}
    }`,
    values: {
      min,
      max,
      rangeType: getRangeType(
        minAmountAndUnit ? parseInt(minAmountAndUnit.amount, 10) : undefined,
        maxAmountAndUnit ? parseInt(maxAmountAndUnit.amount, 10) : undefined
      )
    }
  });
  return new t.Type<string, string, unknown>(
    'durationRt',
    t.string.is,
    (input, context) => {
      return either.chain(t.string.validate(input, context), inputAsString => {
        const { amount, unit } = amountAndUnitToObject(inputAsString);
        const inputDuration = getDuration({ amount, unit });

        const minDuration = minAmountAndUnit
          ? getDuration(minAmountAndUnit)
          : inputDuration;

        const maxDuration = maxAmountAndUnit
          ? getDuration(maxAmountAndUnit)
          : inputDuration;

        const isValidUnit = units.includes(unit);
        const isValidAmount =
          inputDuration >= minDuration && inputDuration <= maxDuration;

        return isValidUnit && isValidAmount
          ? t.success(inputAsString)
          : t.failure(input, context, message);
      });
    },
    t.identity
  );
}
