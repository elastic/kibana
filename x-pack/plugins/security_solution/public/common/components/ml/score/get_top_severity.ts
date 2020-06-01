/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toArray } from 'lodash/fp';
import { Anomaly } from '../types';

export const getTopSeverityJobs = (anomalies: Anomaly[], limit?: number): Anomaly[] => {
  const reduced = anomalies.reduce<Record<string, Anomaly>>((accum, item) => {
    const jobId = item.jobId;
    const severity = item.severity;
    if (accum[jobId] == null || accum[jobId].severity < severity) {
      accum[jobId] = item;
    }
    return accum;
  }, {});
  const sortedArray = toArray(reduced).sort(
    (anomalyA, anomalyB) => anomalyB.severity - anomalyA.severity
  );

  if (limit == null) {
    return sortedArray;
  } else {
    return sortedArray.slice(0, limit);
  }
};
