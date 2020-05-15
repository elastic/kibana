/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment-timezone';

export function getTimezoneOffsetInMs(time: number) {
  // @ts-ignore moment types don't define defaultZone but it's there
  const zone = moment.defaultZone ? moment.defaultZone.name : moment.tz.guess();

  // @ts-ignore
  return moment.tz.zone(zone).parse(time) * 60000;
}
