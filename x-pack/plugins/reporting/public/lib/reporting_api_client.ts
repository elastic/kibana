/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringify } from 'query-string';
import rison from 'rison-node';
import { HttpSetup } from 'src/core/public';
import { JobId, SourceJob } from '../../common/types';
import { API_BASE_GENERATE, API_LIST_URL, REPORTING_MANAGEMENT_HOME } from '../../constants';
import { add } from './job_completion_notifications';

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
    warnings: string[];
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

interface JobParams {
  [paramName: string]: any;
}

export class ReportingAPIClient {
  private http: HttpSetup;

  constructor(http: HttpSetup) {
    this.http = http;
  }

  public getReportURL(jobId: string) {
    const apiBaseUrl = this.http.basePath.prepend(API_LIST_URL);
    const downloadLink = `${apiBaseUrl}/download/${jobId}`;

    return downloadLink;
  }

  public downloadReport(jobId: string) {
    const location = this.getReportURL(jobId);

    window.open(location);
  }

  public async deleteReport(jobId: string) {
    return await this.http.delete(`${API_LIST_URL}/delete/${jobId}`, {
      asSystemRequest: true,
    });
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

  public findForJobIds = (jobIds: JobId[]): Promise<SourceJob[]> => {
    return this.http.fetch(`${API_LIST_URL}/list`, {
      query: { page: 0, ids: jobIds.join(',') },
      method: 'GET',
    });
  };

  /*
   * Return a URL to queue a job, with the job params encoded in the query string of the URL. Used for copying POST URL
   */
  public getReportingJobPath = (exportType: string, jobParams: JobParams) => {
    const params = stringify({ jobParams: rison.encode(jobParams) });
    return `${this.http.basePath.prepend(API_BASE_GENERATE)}/${exportType}?${params}`;
  };

  /*
   * Sends a request to queue a job, with the job params in the POST body
   */
  public createReportingJob = async (exportType: string, jobParams: any) => {
    const jobParamsRison = rison.encode(jobParams);
    const resp = await this.http.post(`${API_BASE_GENERATE}/${exportType}`, {
      method: 'POST',
      body: JSON.stringify({
        jobParams: jobParamsRison,
      }),
    });

    add(resp.job.id);

    return resp;
  };

  public getManagementLink = () => this.http.basePath.prepend(REPORTING_MANAGEMENT_HOME);

  public getDownloadLink = (jobId: JobId) =>
    this.http.basePath.prepend(`${API_LIST_URL}/download/${jobId}`);

  /*
   * provides the raw server basePath to allow it to be stripped out from relativeUrls in job params
   */
  public getServerBasePath = () => this.http.basePath.serverBasePath;
}
