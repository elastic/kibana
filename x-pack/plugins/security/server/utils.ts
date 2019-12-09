/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Duration } from 'moment';

export function durationToMs(duration: number | Duration | null) {
  if (duration === null || typeof duration === 'number') {
    return duration;
  }

  return duration.asMilliseconds();
}
