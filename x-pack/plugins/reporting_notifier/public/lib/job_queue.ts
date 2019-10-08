/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFn, JobId, JobContent, SourceJob } from '../../index.d';
import { API_BASE_URL } from '../../constants';

export class JobQueue {
  public findForJobIds = (httpFn: HttpFn, jobIds: JobId[]): Promise<SourceJob[]> => {
    return httpFn().fetch(`${API_BASE_URL}/list`, {
      query: { page: 0, ids: jobIds.join(',') },
      method: 'GET',
    });
  };

  public getContent(httpFn: HttpFn, jobId: JobId): Promise<string> {
    return httpFn()
      .fetch(`${API_BASE_URL}/output/${jobId}`, {
        method: 'GET',
      })
      .then((data: JobContent) => data.content);
  }
}

export const jobQueueClient = new JobQueue();
