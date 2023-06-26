/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useEffect } from 'react';

export function useDateFormat(): (timestamp?: string) => string {
  const locale = navigator.language;

  useEffect(() => {
    moment.locale(locale);
  }, [locale]);

  return (timestamp?: string) => {
    if (!timestamp) return '';
    const date = moment(timestamp);
    return `${date.format('ll')} @ ${date.format('LT')}`;
  };
}
