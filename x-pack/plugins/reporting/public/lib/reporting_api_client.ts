/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringify } from 'query-string';
import rison from 'rison-node';
import { HttpSetup } from 'src/core/public';
import {
  API_BASE_GENERATE,
  API_BASE_URL,
  API_LIST_URL,
  REPORTING_MANAGEMENT_HOME,
} from '../../common/constants';
import {
  DownloadReportFn,
  JobId,
  ManagementLinkFn,
  ReportApiJSON,
  ReportDocument,
  ReportSource,
} from '../../common/types';
import { add } from './job_completion_notifications';

export interface JobQueueEntry {
  _id: string;
  _source: ReportSource;
}

export interface JobContent {
  content: string;
  content_type: boolean;
}

interface JobParams {
  [paramName: string]: any;
}

export interface DiagnoseResponse {
  help: string[];
  success: boolean;
  logs: string;
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

  public getInfo(jobId: string): Promise<ReportApiJSON> {
    return this.http.get(`${API_LIST_URL}/info/${jobId}`, {
      asSystemRequest: true,
    });
  }

  public findForJobIds = (jobIds: JobId[]): Promise<ReportDocument[]> => {
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

  public getManagementLink: ManagementLinkFn = () =>
    this.http.basePath.prepend(REPORTING_MANAGEMENT_HOME);

  public getDownloadLink: DownloadReportFn = (jobId: JobId) =>
    this.http.basePath.prepend(`${API_LIST_URL}/download/${jobId}`);

  /*
   * provides the raw server basePath to allow it to be stripped out from relativeUrls in job params
   */
  public getServerBasePath = () => this.http.basePath.serverBasePath;

  /*
   * Diagnostic-related API calls
   */
  public verifyConfig = (): Promise<DiagnoseResponse> =>
    this.http.post(`${API_BASE_URL}/diagnose/config`, {
      asSystemRequest: true,
    });

  /*
   * Diagnostic-related API calls
   */
  public verifyBrowser = (): Promise<DiagnoseResponse> =>
    this.http.post(`${API_BASE_URL}/diagnose/browser`, {
      asSystemRequest: true,
    });

  /*
   * Diagnostic-related API calls
   */
  public verifyScreenCapture = (): Promise<DiagnoseResponse> =>
    this.http.post(`${API_BASE_URL}/diagnose/screenshot`, {
      asSystemRequest: true,
    });
}
