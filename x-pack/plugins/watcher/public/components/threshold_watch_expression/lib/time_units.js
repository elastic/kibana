/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const timeUnits = {
  'second': {
    labelPlural: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.secondPluralLabel', {
      defaultMessage: 'seconds',
    }),
    labelSingular: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.secondSingularLabel', {
      defaultMessage: 'second',
    }),
    value: 's'
  },
  'minute': {
    labelPlural: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.minutePluralLabel', {
      defaultMessage: 'minutes',
    }),
    labelSingular: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.minuteSingularLabel', {
      defaultMessage: 'minute',
    }),
    value: 'm'
  },
  'hour': {
    labelPlural: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.hourPluralLabel', {
      defaultMessage: 'hours',
    }),
    labelSingular: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.hourSingularLabel', {
      defaultMessage: 'hour',
    }),
    value: 'h'
  },
  'day': {
    labelPlural: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.dayPluralLabel', {
      defaultMessage: 'days',
    }),
    labelSingular: i18n.translate('xpack.watcher.thresholdWatchExpression.timeUnits.daySingularLabel', {
      defaultMessage: 'day',
    }),
    value: 'd'
  }
};
