/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Job, JobId } from '../../../common/types/anomaly_detection_jobs';
import { HttpService } from './http_service';
import { ML_INTERNAL_BASE_PATH } from '../../../common/constants/app';

export class AnomalyDetectorService {
  private readonly apiBasePath = ML_INTERNAL_BASE_PATH + '/anomaly_detectors';

  constructor(private httpService: HttpService) {}
  // I DONT THINK THIS CLASS NEEDS TO EXIST!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // MAKE THE SAME AS getAnomalyCharts$
  /**
   * Fetches a single job object
   * @param jobId
   */
  getJobById$(jobId: JobId): Observable<Job> {
    return this.httpService
      .http$<{ count: number; jobs: Job[] }>({
        path: `${this.apiBasePath}/${jobId}`,
      })
      .pipe(map((response) => response.jobs[0]));
  }

  /**
   * Fetches anomaly detection jobs by ids
   * @param jobIds
   */
  getJobs$(jobIds: JobId[]): Observable<Job[]> {
    return this.httpService
      .http$<{ count: number; jobs: Job[] }>({
        path: `${this.apiBasePath}/${jobIds.join(',')}`,
      })
      .pipe(map((response) => response.jobs));
  }

  /**
   * Extract unique influencers from the job or collection of jobs
   * @param jobs
   */
  extractInfluencers(jobs: Job | Job[]): string[] {
    if (!Array.isArray(jobs)) {
      jobs = [jobs];
    }
    const influencers = new Set<string>();
    for (const job of jobs) {
      for (const influencer of job.analysis_config.influencers || []) {
        influencers.add(influencer);
      }
    }
    return Array.from(influencers);
  }
}
