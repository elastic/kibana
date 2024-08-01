/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJobWithStats } from '../../../../../common/types/anomaly_detection_jobs';
import type { MlJobService } from '../../../services/job_service';

export function stopDatafeeds(
  mlJobService: MlJobService,
  jobs: Array<{ id: string }>,
  callback?: () => void
): Promise<void>;
export function closeJobs(
  mlJobService: MlJobService,
  jobs: Array<{ id: string }>,
  callback?: () => void
): Promise<void>;
export function deleteJobs(
  mlJobService: MlJobService,
  jobs: Array<{ id: string }>,
  deleteUserAnnotations?: boolean,
  deleteAlertingRules?: boolean,
  callback?: () => void
): Promise<void>;
export function resetJobs(
  mlJobService: MlJobService,
  jobIds: string[],
  deleteUserAnnotations?: boolean,
  callback?: () => void
): Promise<void>;
export function loadFullJob(
  mlJobService: MlJobService,
  jobId: string
): Promise<CombinedJobWithStats>;
