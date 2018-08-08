/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function validateJobObject(job) {
  if (job === null || typeof job !== 'object') {
    throw new Error('Invalid job: Needs to be an object.');
  }
  if (job.analysis_config === null || typeof job.analysis_config !== 'object') {
    throw new Error('Invalid analysis_config: Needs to be an object.');
  }
  if (!Array.isArray(job.analysis_config.influencers)) {
    throw new Error('Invalid job.analysis_config.influencers: Needs to be an array.');
  }
  if (!Array.isArray(job.analysis_config.detectors)) {
    throw new Error('Invalid job.analysis_config.detectors: Needs to be an array.');
  }
  if (job.datafeed_config === null || typeof job.datafeed_config !== 'object') {
    throw new Error('Invalid datafeed_config: Needs to be an object.');
  }
  if (!Array.isArray(job.datafeed_config.indices)) {
    throw new Error('Invalid indices: Needs to be an Array.');
  }
  if (job.data_description === null || typeof job.data_description !== 'object') {
    throw new Error('Invalid data_description: Needs to be an object.');
  }
  if (typeof job.data_description.time_field !== 'string') {
    throw new Error('Invalid time_field: Needs to be a string.');
  }
}

