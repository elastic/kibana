/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function deserializeJob(job) {
  const {
    config: {
      id,
      index_pattern: indexPattern,
      rollup_index: rollupIndex,
      cron: rollupCron,
      metrics = [],
      groups: {
        date_histogram: {
          interval: rollupInterval,
          delay: rollupDelay,
          time_zone: dateHistogramTimeZone,
          field: dateHistogramField,
        },
        terms = {
          fields: [],
        },
      },
    },
    status: {
      job_state: status,
      upgraded_doc_id: upgradedDocId,
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
    rollupInterval,
    rollupDelay,
    dateHistogramTimeZone,
    dateHistogramField,
    metrics,
    terms,
    status,
    upgradedDocId,
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
