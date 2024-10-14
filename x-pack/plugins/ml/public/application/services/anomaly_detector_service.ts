/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { Job, JobId } from '../../../common/types/anomaly_detection_jobs';
import type { HttpService } from './http_service';
import { type MlApi, mlApiProvider } from './ml_api_service';

export class AnomalyDetectorService {
  private mlApi: MlApi;

  constructor(httpService: HttpService) {
    this.mlApi = mlApiProvider(httpService);
  }

  /**
   * Fetches a single job object
   * @param jobId
   */
  getJobById$(jobId: JobId): Observable<Job> {
    return this.getJobs$([jobId]).pipe(map((jobs) => jobs[0]));
  }

  /**
   * Fetches anomaly detection jobs by ids
   * @param jobIds
   */
  getJobs$(jobIds: JobId[]): Observable<Job[]> {
    return this.mlApi.getJobs$({ jobId: jobIds.join(',') }).pipe(map((response) => response.jobs));
  }
}
