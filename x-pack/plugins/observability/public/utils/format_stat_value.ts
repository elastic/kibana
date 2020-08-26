/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import numeral from '@elastic/numeral';
import { Stat } from '../typings';

export function formatStatValue(stat: Stat) {
  const { value, type } = stat;
  switch (type) {
    case 'bytesPerSecond':
      return `${numeral(value).format('0.0b')}/s`;
    case 'number':
      return numeral(value).format('0a');
    case 'percent':
      return numeral(value).format('0.0%');
  }
}
