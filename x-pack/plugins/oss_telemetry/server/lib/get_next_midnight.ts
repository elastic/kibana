/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export function getNextMidnight() {
  const randomTranslation = i18n.translate('xpack.oss_telemetry.randomTranslation', {
    defaultMessage: 'Hello randomness',
  });
  console.log('randomTranslation:', randomTranslation);
  const nextMidnight = new Date();
  nextMidnight.setHours(0, 0, 0, 0);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  return nextMidnight.toISOString();
}
