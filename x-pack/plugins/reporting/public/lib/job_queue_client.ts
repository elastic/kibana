/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
// @ts-ignore
import { addSystemApiHeader } from 'ui/system_api';

const API_BASE_URL = '/api/reporting/jobs';

export interface JobQueueEntry {
  _id: string;
  _source: any;
}

export interface JobContent {
  content: string;
  content_type: boolean;
}

class JobQueueClient {
  public list = (page = 0, jobIds?: string[]): Promise<JobQueueEntry[]> => {
    const query = { page } as any;
    if (jobIds && jobIds.length > 0) {
      // Only getting the first 10, to prevent URL overflows
      query.ids = jobIds.slice(0, 10).join(',');
    }
    return kfetch({
      method: 'GET',
      pathname: `${API_BASE_URL}/list`,
      query,
      headers: addSystemApiHeader({}),
    });
  };

  public total(): Promise<number> {
    return kfetch({
      method: 'GET',
      pathname: `${API_BASE_URL}/count`,
      headers: addSystemApiHeader({}),
    });
  }

  public getContent(jobId: string): Promise<JobContent> {
    return kfetch({
      method: 'GET',
      pathname: `${API_BASE_URL}/output/${jobId}`,
      headers: addSystemApiHeader({}),
    });
  }
}

export const jobQueueClient = new JobQueueClient();
