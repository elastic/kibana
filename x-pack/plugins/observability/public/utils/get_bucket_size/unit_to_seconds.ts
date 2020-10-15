/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment, { unitOfTime as UnitOfTIme } from 'moment';

function getDurationAsSeconds(value: number, unitOfTime: UnitOfTIme.Base) {
  return moment.duration(value, unitOfTime).asSeconds();
}

const units = {
  ms: getDurationAsSeconds(1, 'millisecond'),
  s: getDurationAsSeconds(1, 'second'),
  m: getDurationAsSeconds(1, 'minute'),
  h: getDurationAsSeconds(1, 'hour'),
  d: getDurationAsSeconds(1, 'day'),
  w: getDurationAsSeconds(1, 'week'),
  M: getDurationAsSeconds(1, 'month'),
  y: getDurationAsSeconds(1, 'year'),
};

export function unitToSeconds(unit: string) {
  return units[unit as keyof typeof units];
}
