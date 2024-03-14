/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const formatAge = (age?: string) => {
  if (!age) {
    return '--';
  }
  const [value] = age.split('d');
  return i18n.translate('xpack.synthetics.settingsRoute.table.retentionPeriodValue', {
    defaultMessage: '{value} {value, plural, one {day} other {days}} + rollover',
    values: { value },
  });
};
