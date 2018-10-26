/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { COMPARATORS } from 'plugins/watcher/../common/constants';

export const comparators = {
  'above': {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.comparators.isAboveLabel', {
      defaultMessage: 'Is above',
    }),
    value: COMPARATORS.GREATER_THAN
  },
  'below': {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.comparators.isBelowLabel', {
      defaultMessage: 'Is below',
    }),
    value: COMPARATORS.LESS_THAN
  }
};
