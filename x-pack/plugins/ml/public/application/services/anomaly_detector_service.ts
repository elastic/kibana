/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Job, JobId } from '../../../common/types/anomaly_detection_jobs';
import { HttpService } from './http_service';
import { type MlApiServices, mlApiServicesProvider } from './ml_api_service';

export class AnomalyDetectorService {
  private mlApiServices: MlApiServices;

  constructor(httpService: HttpService) {
    this.mlApiServices = mlApiServicesProvider(httpService);
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
    return this.mlApiServices
      .getJobs$({ jobId: jobIds.join(',') })
      .pipe(map((response) => response.jobs));
  }
}
