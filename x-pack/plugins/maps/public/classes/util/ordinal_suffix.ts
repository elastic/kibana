/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getOrdinalSuffix(value: number) {
  const lastDigit = value % 10;
  if (lastDigit === 1 && value !== 11) {
    return i18n.translate('xpack.maps.styles.firstOrdinalSuffix', {
      defaultMessage: 'st',
    });
  }

  if (lastDigit === 2 && value !== 12) {
    return i18n.translate('xpack.maps.styles.secondOrdinalSuffix', {
      defaultMessage: 'nd',
    });
  }

  if (lastDigit === 3 && value !== 13) {
    return i18n.translate('xpack.maps.styles.thirdOrdinalSuffix', {
      defaultMessage: 'rd',
    });
  }

  return i18n.translate('xpack.maps.styles.ordinalSuffix', {
    defaultMessage: 'th',
  });
}
