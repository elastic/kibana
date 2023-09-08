/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';

export type DateFormatter = (timestamp?: string) => string;
export function useDateFormat(): DateFormatter {
  const kibanaLocale = i18n.getLocale();
  const clientLocale = navigator.language;

  useEffect(() => {
    const preferredLocale = kibanaLocale ?? clientLocale;
    if (moment.locale() !== preferredLocale) {
      moment.locale(preferredLocale);
    }
  }, [kibanaLocale, clientLocale]);

  return (timestamp?: string) => {
    if (!timestamp) return '';
    const date = moment(timestamp);
    return `${date.format('ll')} @ ${date.format('LT')}`;
  };
}
