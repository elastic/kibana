/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Job, JobId } from '../../../common/types/anomaly_detection_jobs';
import { basePath } from './ml_api_service';
import { HttpService } from './http_service';

export class MlAnomalyDetectorService {
  private readonly apiBasePath = basePath() + '/anomaly_detectors';

  constructor(private httpService: HttpService) {}

  /**
   * Fetches a single job object
   * @param jobId
   */
  getJobById$(jobId: JobId): Observable<Job> {
    return this.httpService
      .http$<{ count: number; jobs: Job[] }>({
        path: `${this.apiBasePath}/${jobId}`,
      })
      .pipe(
        map(response => {
          return response.jobs[0];
        })
      );
  }

  getJobs$(jobIds: JobId[]): Observable<Job[]> {
    return forkJoin(jobIds.map(jobId => this.getJobById$(jobId)));
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
      for (const influencer of job.analysis_config.influencers) {
        influencers.add(influencer);
      }
    }
    return Array.from(influencers);
  }
}
