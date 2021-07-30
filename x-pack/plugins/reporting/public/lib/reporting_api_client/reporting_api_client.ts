/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { stringify } from 'query-string';
import rison from 'rison-node';
import { HttpSetup } from 'src/core/public';
import {
  API_BASE_GENERATE,
  API_BASE_URL,
  API_LIST_URL,
  API_MIGRATE_ILM_POLICY_URL,
  REPORTING_MANAGEMENT_HOME,
} from '../../../common/constants';
import { DownloadReportFn, JobId, ManagementLinkFn, ReportApiJSON } from '../../../common/types';
import { add } from '../../notifier/job_completion_notifications';
import { Job } from '../job';

export interface DiagnoseResponse {
  help: string[];
  success: boolean;
  logs: string;
}

interface JobParams {
  [paramName: string]: any;
}

interface IReportingAPI {
  // Helpers
  getReportURL(jobId: string): string;
  getReportingJobPath(exportType: string, jobParams: JobParams): string; // Return a URL to queue a job, with the job params encoded in the query string of the URL. Used for copying POST URL
  createReportingJob(exportType: string, jobParams: any): Promise<Job>; // Sends a request to queue a job, with the job params in the POST body
  getServerBasePath(): string; // Provides the raw server basePath to allow it to be stripped out from relativeUrls in job params

  // CRUD
  downloadReport(jobId: string): void;
  deleteReport(jobId: string): Promise<void>;
  list(page: number, jobIds: string[]): Promise<Job[]>; // gets the first 10 report of the page
  total(): Promise<number>;
  getError(jobId: string): Promise<string>;
  getInfo(jobId: string): Promise<Job>;
  findForJobIds(jobIds: string[]): Promise<Job[]>;

  // Function props
  getManagementLink: ManagementLinkFn;
  getDownloadLink: DownloadReportFn;

  // Diagnostic-related API calls
  verifyConfig(): Promise<DiagnoseResponse>;
  verifyBrowser(): Promise<DiagnoseResponse>;
  verifyScreenCapture(): Promise<DiagnoseResponse>;
}

export class ReportingAPIClient implements IReportingAPI {
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

  public async list(page = 0, jobIds: string[] = []) {
    const query = { page } as any;
    if (jobIds.length > 0) {
      // Only getting the first 10, to prevent URL overflows
      query.ids = jobIds.slice(0, 10).join(',');
    }

    const jobQueueEntries: ReportApiJSON[] = await this.http.get(`${API_LIST_URL}/list`, {
      query,
      asSystemRequest: true,
    });

    return jobQueueEntries.map((report) => new Job(report));
  }

  public async total() {
    return await this.http.get(`${API_LIST_URL}/count`, {
      asSystemRequest: true,
    });
  }

  public async getError(jobId: string) {
    const job = await this.getInfo(jobId);

    if (job.warnings?.[0]) {
      // the error message of a failed report is a singular string in the warnings array
      return job.warnings[0];
    }

    return i18n.translate('xpack.reporting.apiClient.unknownError', {
      defaultMessage: `Report job {job} failed: Unknown error.`,
      values: { job: jobId },
    });
  }

  public async getInfo(jobId: string) {
    const report: ReportApiJSON = await this.http.get(`${API_LIST_URL}/info/${jobId}`, {
      asSystemRequest: true,
    });
    return new Job(report);
  }

  public async findForJobIds(jobIds: JobId[]) {
    const reports: ReportApiJSON[] = await this.http.fetch(`${API_LIST_URL}/list`, {
      query: { page: 0, ids: jobIds.join(',') },
      method: 'GET',
    });
    return reports.map((report) => new Job(report));
  }

  public getReportingJobPath(exportType: string, jobParams: JobParams) {
    const params = stringify({ jobParams: rison.encode(jobParams) });
    return `${this.http.basePath.prepend(API_BASE_GENERATE)}/${exportType}?${params}`;
  }

  public async createReportingJob(exportType: string, jobParams: any) {
    const jobParamsRison = rison.encode(jobParams);
    const resp: { job: ReportApiJSON } = await this.http.post(
      `${API_BASE_GENERATE}/${exportType}`,
      {
        method: 'POST',
        body: JSON.stringify({
          jobParams: jobParamsRison,
        }),
      }
    );

    add(resp.job.id);

    return new Job(resp.job);
  }

  public getManagementLink: ManagementLinkFn = () =>
    this.http.basePath.prepend(REPORTING_MANAGEMENT_HOME);

  public getDownloadLink: DownloadReportFn = (jobId: JobId) =>
    this.http.basePath.prepend(`${API_LIST_URL}/download/${jobId}`);

  public getServerBasePath = () => this.http.basePath.serverBasePath;

  public async verifyConfig() {
    return await this.http.post(`${API_BASE_URL}/diagnose/config`, {
      asSystemRequest: true,
    });
  }

  public async verifyBrowser() {
    return await this.http.post(`${API_BASE_URL}/diagnose/browser`, {
      asSystemRequest: true,
    });
  }

  public async verifyScreenCapture() {
    return await this.http.post(`${API_BASE_URL}/diagnose/screenshot`, {
      asSystemRequest: true,
    });
  }

  public async migrateReportingIndicesIlmPolicy() {
    return await this.http.put(`${API_MIGRATE_ILM_POLICY_URL}`);
  }
}
