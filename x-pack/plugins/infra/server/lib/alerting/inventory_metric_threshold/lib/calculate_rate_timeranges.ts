/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InfraTimerangeInput } from '../../../../../common/http_api';

export const calculateRateTimeranges = (timerange: InfraTimerangeInput) => {
  // This is the total number of milliseconds for the entire timerange
  const totalTime = timerange.to - timerange.from;
  // Halfway is the to minus half the total time;
  const halfway = timerange.to - totalTime / 2;
  // The interval is half the total time (divided by 1000 to convert to seconds)
  const intervalInSeconds = totalTime / 2000;

  // The first bucket is from the beginning of the time range to the halfway point
  const firstBucketRange = {
    from: timerange.from,
    to: halfway,
  };

  // The second bucket is from the halfway point to the end of the timerange
  const secondBucketRange = {
    from: halfway,
    to: timerange.to,
  };

  return { firstBucketRange, secondBucketRange, intervalInSeconds };
};
