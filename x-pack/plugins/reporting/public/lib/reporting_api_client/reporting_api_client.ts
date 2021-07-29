/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'query-string';
import rison, { RisonObject } from 'rison-node';
import { HttpSetup, IUiSettingsClient } from 'src/core/public';
import moment from 'moment';
import {
  API_BASE_GENERATE,
  API_BASE_URL,
  API_GENERATE_IMMEDIATE,
  API_LIST_URL,
  API_MIGRATE_ILM_POLICY_URL,
  REPORTING_MANAGEMENT_HOME,
} from '../../../common/constants';
import {
  BaseParams,
  DownloadReportFn,
  JobId,
  ManagementLinkFn,
  ReportApiJSON,
} from '../../../common/types';
import { add } from '../../notifier/job_completion_notifications';
import { Job } from '../job';

export interface JobContent {
  content: string;
  content_type: boolean;
}

export interface DiagnoseResponse {
  help: string[];
  success: boolean;
  logs: string;
}

interface IReportingAPI {
  // Helpers
  getReportURL(jobId: string): string;
  getReportingJobPath<T>(exportType: string, jobParams: BaseParams & T): string; // Return a URL to queue a job, with the job params encoded in the query string of the URL. Used for copying POST URL
  createReportingJob(exportType: string, jobParams: any): Promise<Job>; // Sends a request to queue a job, with the job params in the POST body
  getServerBasePath(): string; // Provides the raw server basePath to allow it to be stripped out from relativeUrls in job params

  // CRUD
  downloadReport(jobId: string): void;
  deleteReport(jobId: string): Promise<void>;
  list(page: number, jobIds: string[]): Promise<Job[]>; // gets the first 10 report of the page
  total(): Promise<number>;
  getError(jobId: string): Promise<JobContent>;
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
  constructor(
    private http: HttpSetup,
    private uiSettings: IUiSettingsClient,
    private kibanaVersion: string
  ) {}

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
    return await this.http.get(`${API_LIST_URL}/output/${jobId}`, {
      asSystemRequest: true,
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

  public getReportingJobPath(exportType: string, jobParams: BaseParams) {
    const risonObject: RisonObject = jobParams as Record<string, any>;
    const params = stringify({ jobParams: rison.encode(risonObject) });
    return `${this.http.basePath.prepend(API_BASE_GENERATE)}/${exportType}?${params}`;
  }

  public async createReportingJob(exportType: string, jobParams: BaseParams) {
    const risonObject: RisonObject = jobParams as Record<string, any>;
    const jobParamsRison = rison.encode(risonObject);
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

  public async createImmediateReport(params: BaseParams) {
    return this.http.post(`${API_GENERATE_IMMEDIATE}`, { body: JSON.stringify(params) });
  }

  public getDecoratedJobParams<T extends Omit<BaseParams, 'browserTimezone' | 'version'>>(
    baseParams: T
  ): BaseParams {
    // If the TZ is set to the default "Browser", it will not be useful for
    // server-side export. We need to derive the timezone and pass it as a param
    // to the export API.
    const browserTimezone: string =
      this.uiSettings.get('dateFormat:tz') === 'Browser'
        ? moment.tz.guess()
        : this.uiSettings.get('dateFormat:tz');

    return {
      browserTimezone,
      version: this.kibanaVersion,
      ...baseParams,
    };
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
