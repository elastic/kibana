/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function removeEmptyValues(object) {
  Object.keys(object).forEach(key => {
    if (object[key] == null || object[key].trim() === '') {
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
    rollupDelay,
    rollupPageSize,
    dateHistogramTimeZone,
    dateHistogramField,
    metrics,
    terms,
    histogram,
    histogramInterval,
  } = jobConfig;

  const serializedJob = {
    id,
    index_pattern: indexPattern,
    rollup_index: rollupIndex,
    cron: rollupCron,
    page_size: rollupPageSize,
    groups: {
      date_histogram: removeEmptyValues({
        interval: dateHistogramInterval,
        delay: rollupDelay,
        time_zone: dateHistogramTimeZone,
        field: dateHistogramField,
      }),
    },
  };

  if (terms.length) {
    serializedJob.groups.terms = {
      fields: terms.map(({ name }) => name),
    };
  }

  if (histogram.length) {
    serializedJob.groups.histogram = {
      interval: histogramInterval,
      fields: histogram.map(({ name }) => name),
    };
  }

  if (metrics.length) {
    serializedJob.metrics = [];
    metrics.forEach(({ name, types }) => {
      // Exclude any metrics which have been selected but not configured with any types.
      if (types.length) {
        serializedJob.metrics.push({
          field: name,
          metrics: types,
        });
      }
    });
  }

  return serializedJob;
}

export function deserializeJob(job) {
  const {
    config: {
      id,
      index_pattern: indexPattern,
      rollup_index: rollupIndex,
      cron: rollupCron,
      metrics,
      groups: {
        date_histogram: {
          interval,
          fixed_interval: fixedInterval,
          calendar_interval: calendarInterval,
          delay: rollupDelay,
          time_zone: dateHistogramTimeZone,
          field: dateHistogramField,
        },
        terms,
        histogram,
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

  // `interval` is deprecated but still supported. All three of the various interval types are
  // mutually exclusive.
  const dateHistogramInterval = interval || fixedInterval || calendarInterval;

  const deserializedJob = {
    id,
    indexPattern,
    rollupIndex,
    rollupCron,
    dateHistogramInterval,
    rollupDelay,
    dateHistogramTimeZone,
    dateHistogramField,
    status,
    metrics: [],
    terms: [],
    histogram: [],
    documentsProcessed,
    pagesProcessed,
    rollupsIndexed,
    triggerCount,
    json,
  };

  if (metrics) {
    metrics.forEach(({ field, metrics }) => {
      deserializedJob.metrics.push({
        name: field,
        types: metrics,
      });
    });
  }

  if (terms) {
    deserializedJob.terms = terms.fields.map(name => ({ name }));
  }

  if (histogram) {
    deserializedJob.histogram = histogram.fields.map(name => ({ name }));
    deserializedJob.histogramInterval = histogram.interval;
  }

  return deserializedJob;
}

export function deserializeJobs(jobs) {
  return jobs.map(deserializeJob);
}
