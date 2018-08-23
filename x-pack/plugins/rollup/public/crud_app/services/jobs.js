/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function removeUndefinedValues(object) {
  Object.keys(object).forEach(key => {
    if (object[key] == null) {
      delete object[key];
    }
  });

  return object;
}

export function serializeJob(jobConfig) {
  const {
    id,
    indexPattern,
    rollupIndex,
    rollupCron,
    dateHistogramInterval,
    dateHistogramDelay,
    rollupPageSize,
    dateHistogramTimeZone,
    dateHistogramField,
    metrics,
    terms,
    histogram,
    histogramInterval,
  } = jobConfig;

  return {
    id,
    index_pattern: indexPattern,
    rollup_index: rollupIndex,
    cron: rollupCron,
    page_size: rollupPageSize,
    metrics,
    groups: {
      date_histogram: removeUndefinedValues({
        interval: dateHistogramInterval,
        delay: dateHistogramDelay,
        time_zone: dateHistogramTimeZone,
        field: dateHistogramField,
      }),
      terms: {
        fields: terms,
      },
      histogram: {
        interval: histogramInterval,
        fields: histogram,
      },
    },
  };
}

export function deserializeJob(job) {
  const {
    config: {
      id,
      index_pattern: indexPattern,
      rollup_index: rollupIndex,
      cron: rollupCron,
      metrics = [],
      groups: {
        date_histogram: {
          interval: dateHistogramInterval,
          delay: dateHistogramDelay,
          time_zone: dateHistogramTimeZone,
          field: dateHistogramField,
        },
        terms = {
          fields: [],
        },
        histogram = {
          fields: [],
        },
      },
    },
    status: {
      job_state: status,
    },
    stats: {
      documents_processed: documentsProcessed,
      pages_processed: pagesProcessed,
      rollups_indexed: rollupsIndexed,
      trigger_count: triggerCount,
    },
  } = job;

  const json = job;

  return {
    id,
    indexPattern,
    rollupIndex,
    rollupCron,
    dateHistogramInterval,
    dateHistogramDelay,
    dateHistogramTimeZone,
    dateHistogramField,
    metrics,
    terms,
    histogram,
    status,
    documentsProcessed,
    pagesProcessed,
    rollupsIndexed,
    triggerCount,
    json,
  };
}

export function deserializeJobs(jobs) {
  return jobs.map(deserializeJob);
}
