/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { calculateAuto } from './calculate_auto';

export function calculateTimeseriesInterval(
  lowerBoundInMsSinceEpoch,
  upperBoundInMsSinceEpoch,
  minIntervalSeconds
) {
  const duration = moment.duration(upperBoundInMsSinceEpoch - lowerBoundInMsSinceEpoch, 'ms');

  return Math.max(minIntervalSeconds, calculateAuto(100, duration).asSeconds());
}
