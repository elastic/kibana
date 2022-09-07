/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export function durationToText(input?: moment.Duration): string {
  if (input) {
    const hours = input.hours();
    const minutes = input.minutes();
    const seconds = input.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return '--';
  }
}
