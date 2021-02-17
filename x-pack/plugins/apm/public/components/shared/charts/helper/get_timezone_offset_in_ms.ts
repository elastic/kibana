/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

export function getTimezoneOffsetInMs(time: number) {
  // @ts-expect-error moment types don't define defaultZone but it's there
  const zone = moment.defaultZone ? moment.defaultZone.name : moment.tz.guess();

  // @ts-expect-error
  return moment.tz.zone(zone).parse(time) * 60000;
}
