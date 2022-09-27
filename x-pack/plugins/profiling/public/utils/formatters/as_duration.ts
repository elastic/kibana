/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import moment from 'moment';

export function asDuration(valueInSeconds: number) {
  if (valueInSeconds === 0) {
    return i18n.translate('xpack.profiling.zeroSeconds', { defaultMessage: '0 seconds' });
  }
  return moment.duration(valueInSeconds * 1000).humanize();
}
