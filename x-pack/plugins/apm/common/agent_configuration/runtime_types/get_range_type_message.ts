/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFinite } from 'lodash';
import { i18n } from '@kbn/i18n';
import { amountAndUnitToObject } from '../amount_and_unit';

function getRangeType(min?: number, max?: number) {
  if (isFinite(min) && isFinite(max)) {
    return 'between';
  } else if (isFinite(min)) {
    return 'gt'; // greater than
  } else if (isFinite(max)) {
    return 'lt'; // less than
  }
}

export function getRangeTypeMessage(
  min?: number | string,
  max?: number | string
) {
  return i18n.translate('xpack.apm.agentConfig.range.errorText', {
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
        typeof min === 'string' ? amountAndUnitToObject(min).amount : min,
        typeof max === 'string' ? amountAndUnitToObject(max).amount : max
      ),
    },
  });
}
