/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY } from '@kbn/reporting-common';
import { JobId } from '@kbn/reporting-common/types';

const set = (jobs: string[]) => {
  sessionStorage.setItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JSON.stringify(jobs));
};

const getAll = (): string[] => {
  const sessionValue = sessionStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
  return sessionValue ? JSON.parse(sessionValue) : [];
};

export const add = (jobId: JobId) => {
  const jobs = getAll();
  jobs.push(jobId);
  set(jobs);
};

export const remove = (jobId: JobId) => {
  const jobs = getAll();
  const index = jobs.indexOf(jobId);

  if (!index) {
    throw new Error('Unable to find job to remove it');
  }

  jobs.splice(index, 1);
  set(jobs);
};
