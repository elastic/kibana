/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { COMPARATORS } from '../../../common/constants';

export interface Comparator {
  text: string;
  value: string;
}
export const comparators: { [key: string]: Comparator } = {
  [COMPARATORS.GREATER_THAN]: {
    text: i18n.translate('xpack.watcher.thresholdWatchExpression.comparators.isAboveLabel', {
      defaultMessage: 'Is above',
    }),
    value: COMPARATORS.GREATER_THAN,
  },
  [COMPARATORS.LESS_THAN]: {
    text: i18n.translate('xpack.watcher.thresholdWatchExpression.comparators.isBelowLabel', {
      defaultMessage: 'Is below',
    }),
    value: COMPARATORS.LESS_THAN,
  },
};
