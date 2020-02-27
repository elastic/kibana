/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from '../../';
import { API_LIST_URL, API_BASE_URL } from '../../constants';

export interface JobQueueEntry {
  _id: string;
  _source: any;
}

export interface JobContent {
  content: string;
  content_type: boolean;
}

export interface JobInfo {
  kibana_name: string;
  kibana_id: string;
  browser_type: string;
  created_at: string;
  priority: number;
  jobtype: string;
  created_by: string;
  timeout: number;
  output: {
    content_type: string;
    size: number;
  };
  process_expiration: string;
  completed_at: string;
  payload: {
    layout: { id: string; dimensions: { width: number; height: number } };
    objects: Array<{ relativeUrl: string }>;
    type: string;
    title: string;
    forceNow: string;
    browserTimezone: string;
  };
  meta: {
    layout: string;
    objectType: string;
  };
  max_attempts: number;
  started_at: string;
  attempts: number;
  status: string;
}

export class JobQueueClient {
  private http: HttpSetup;

  constructor(http: HttpSetup) {
    this.http = http;
  }

  public getReportURL(jobId: string) {
    const apiBaseUrl = this.http.basePath.prepend(API_BASE_URL);
    const downloadLink = `${apiBaseUrl}/jobs/download/${jobId}`;

    return downloadLink;
  }

  public downloadReport(jobId: string) {
    const location = this.getReportURL(jobId);

    window.open(location);
  }

  public list = (page = 0, jobIds: string[] = []): Promise<JobQueueEntry[]> => {
    const query = { page } as any;
    if (jobIds.length > 0) {
      // Only getting the first 10, to prevent URL overflows
      query.ids = jobIds.slice(0, 10).join(',');
    }

    return this.http.get(`${API_LIST_URL}/list`, {
      query,
      asSystemRequest: true,
    });
  };

  public total(): Promise<number> {
    return this.http.get(`${API_LIST_URL}/count`, {
      asSystemRequest: true,
    });
  }

  public getContent(jobId: string): Promise<JobContent> {
    return this.http.get(`${API_LIST_URL}/output/${jobId}`, {
      asSystemRequest: true,
    });
  }

  public getInfo(jobId: string): Promise<JobInfo> {
    return this.http.get(`${API_LIST_URL}/info/${jobId}`, {
      asSystemRequest: true,
    });
  }
}
