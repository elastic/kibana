/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { calculateAuto } from '@kbn/calculate-auto';

export const getFieldIntervalInSeconds = ({
  start,
  end,
  buckets = 10,
  minIntervalSeconds = 60,
}: {
  start: number;
  end: number;
  buckets?: number;
  minIntervalSeconds?: number;
}) => {
  const duration = moment.duration(end - start, 'ms');

  return Math.max(calculateAuto.near(buckets, duration)?.asSeconds() ?? 0, minIntervalSeconds);
};
