/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobStatus } from '../../common/types';

export const statuses: Record<string, JobStatus> = {
  JOB_STATUS_PENDING: 'pending',
  JOB_STATUS_PROCESSING: 'processing',
  JOB_STATUS_COMPLETED: 'completed',
  JOB_STATUS_WARNINGS: 'completed_with_warnings',
  JOB_STATUS_FAILED: 'failed',
};
