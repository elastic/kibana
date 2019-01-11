/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * utils for Anomaly Explorer.
 */

import { parseInterval } from 'ui/utils/parse_interval';

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
export function createJobs(jobs) {
  return jobs.map(job => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return { id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() };
  });
}

export function getDefaultViewBySwimlaneData() {
  return {
    fieldName: '',
    laneLabels: [],
    points: [],
    interval: 3600
  };
}

export function getSelectedJobIds(jobs) {
  const selectedJobs = jobs.filter(job => job.selected);
  return selectedJobs.map(job => job.id);
}
