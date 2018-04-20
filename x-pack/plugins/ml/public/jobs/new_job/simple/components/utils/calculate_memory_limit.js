/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// calculates the size of the model memory limit used in the job config
// based on the cardinality of the field being used to split the data.
// the limit should be 10MB plus 20kB per series, rounded up to the nearest MB.

export function CalculateModelMemoryLimitProvider(ml) {
  return function calculateModelMemoryLimit(
    indexPattern,
    splitFieldName,
    query,
    fieldNames,
    influencerNames,
    timeFieldName,
    earliestMs,
    latestMs) {
    return ml.calculateModelMemoryLimit({
      indexPattern,
      splitFieldName,
      query,
      fieldNames,
      influencerNames,
      timeFieldName,
      earliestMs,
      latestMs
    });
  };
}
