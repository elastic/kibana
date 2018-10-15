/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGG_TYPES } from 'plugins/watcher/../common/constants';
import { i18n } from '@kbn/i18n';

export const aggTypes = {
  count: {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.aggTypes.countLabel', {
      defaultMessage: 'count()',
    }),
    fieldRequired: false,
    value: AGG_TYPES.COUNT
  },
  average: {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.aggTypes.averageLabel', {
      defaultMessage: 'average()',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGG_TYPES.AVERAGE
  },
  sum: {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.aggTypes.sumLabel', {
      defaultMessage: 'sum()',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number'],
    value: AGG_TYPES.SUM
  },
  min: {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.aggTypes.minLabel', {
      defaultMessage: 'min()',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGG_TYPES.MIN
  },
  max: {
    label: i18n.translate('xpack.watcher.thresholdWatchExpression.aggTypes.maxLabel', {
      defaultMessage: 'max()',
    }),
    fieldRequired: true,
    validNormalizedTypes: ['number', 'date'],
    value: AGG_TYPES.MAX
  }
};
