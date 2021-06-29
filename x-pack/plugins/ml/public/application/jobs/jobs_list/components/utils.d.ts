/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CombinedJobWithStats } from '../../../../../common/types/anomaly_detection_jobs';

export function deleteJobs(jobs: Array<{ id: string }>, callback?: () => void): Promise<void>;
export function loadFullJob(jobId: string): Promise<CombinedJobWithStats>;
