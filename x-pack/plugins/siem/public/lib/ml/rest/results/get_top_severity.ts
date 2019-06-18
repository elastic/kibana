/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toArray } from 'lodash/fp';

export const getTopSeverityJobs = anomalies => {
  console.log('My anomalies before reduction are:', anomalies);
  const reduced = anomalies.reduce((accum, item) => {
    console.log('item is:', item);
    const jobId = item.jobId;
    const severity = item.severity;
    if (accum[jobId] == null || (accum[jobId] != null && accum[jobId].severity < severity)) {
      accum[jobId] = item;
    }
    return accum;
  }, {});
  console.log('My anomalies before the array is:', reduced, typeof reduced);
  const myArray = toArray(reduced);
  const sortedArray = myArray.sort((anomalyA, anomalyB) => {
    console.log('XX -->', anomalyA, anomalyB);
    return anomalyB.severity - anomalyA.severity;
  });
  console.log('My anomalies reduced in an array is now:', sortedArray);
  return sortedArray;
};
