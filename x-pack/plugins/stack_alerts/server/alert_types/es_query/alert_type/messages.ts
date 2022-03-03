/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { getHumanReadableComparator } from '../../lib';

export function getInvalidComparatorError(comparator: string) {
  return i18n.translate('xpack.stackAlerts.esQuery.invalidComparatorErrorMessage', {
    defaultMessage: 'invalid thresholdComparator specified: {comparator}',
    values: {
      comparator,
    },
  });
}

export function getContextConditionsDescription(comparator: string, threshold: number[]) {
  return i18n.translate('Number of matching documents is {comparator} {threshold}', {
    defaultMessage: 'Number of matching documents is {comparator} {threshold}',
    values: {
      comparator: getHumanReadableComparator(comparator),
      threshold: threshold.join(' and '),
    },
  });
}
