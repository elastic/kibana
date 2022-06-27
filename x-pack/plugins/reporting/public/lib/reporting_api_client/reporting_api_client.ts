/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { stringify } from 'query-string';
import rison from 'rison-node';
import type { HttpFetchQuery } from '@kbn/core/public';
import { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import { buildKibanaPath } from '../../../common/build_kibana_path';
import {
  API_BASE_GENERATE,
  API_BASE_URL,
  API_GENERATE_IMMEDIATE,
  API_LIST_URL,
  API_MIGRATE_ILM_POLICY_URL,
  getRedirectAppPath,
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

/*
 * For convenience, apps do not have to provide the browserTimezone and Kibana version.
 * Those fields are added in this client as part of the service.
 * TODO: export a type like this to other plugins: https://github.com/elastic/kibana/issues/107085
 */
type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

export interface DiagnoseResponse {
  help: string[];
  success: boolean;
  logs: string;
}

interface IReportingAPI {
  // Helpers
  getReportURL(jobId: string): string;
  getReportingJobPath<T>(exportType: string, jobParams: BaseParams & T): string; // Return a URL to queue a job, with the job params encoded in the query string of the URL. Used for copying POST URL
  createReportingJob<T>(exportType: string, jobParams: BaseParams & T): Promise<Job>; // Sends a request to queue a job, with the job params in the POST body
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
  verifyBrowser(): Promise<DiagnoseResponse>;
  verifyScreenCapture(): Promise<DiagnoseResponse>;
}

/**
 * Client class for interacting with Reporting APIs
 * @implements IReportingAPI
 */
export class ReportingAPIClient implements IReportingAPI {
  private http: HttpSetup;

  constructor(
    http: HttpSetup,
    private uiSettings: IUiSettingsClient,
    private kibanaVersion: string
  ) {
    this.http = http;
  }

  public getKibanaAppHref(job: Job): string {
    const searchParams = stringify({ jobId: job.id });

    const path = buildKibanaPath({
      basePath: this.http.basePath.serverBasePath,
      spaceId: job.spaceId,
      appPath: getRedirectAppPath(),
    });

    const href = `${path}?${searchParams}`;
    return href;
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
    return await this.http.delete<void>(`${API_LIST_URL}/delete/${jobId}`, {
      asSystemRequest: true,
    });
  }

  public async list(page = 0, jobIds: string[] = []) {
    const query: HttpFetchQuery = { page };
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
    return await this.http.get<number>(`${API_LIST_URL}/count`, {
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
      defaultMessage: `Report job {job} failed. Error unknown.`,
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

  public getReportingJobPath(exportType: string, jobParams: BaseParams) {
    const params = stringify({
      jobParams: rison.encode(jobParams),
    });
    return `${this.http.basePath.prepend(API_BASE_GENERATE)}/${exportType}?${params}`;
  }

  public async createReportingJob(exportType: string, jobParams: BaseParams) {
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

  public async createImmediateReport(baseParams: BaseParams) {
    const { objectType: _objectType, ...params } = baseParams; // objectType is not needed for immediate download api
    return this.http.post(`${API_GENERATE_IMMEDIATE}`, {
      asResponse: true,
      body: JSON.stringify(params),
    });
  }

  public getDecoratedJobParams<T extends AppParams>(baseParams: T): BaseParams {
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

  public verifyBrowser() {
    return this.http.post<DiagnoseResponse>(`${API_BASE_URL}/diagnose/browser`, {
      asSystemRequest: true,
    });
  }

  public verifyScreenCapture() {
    return this.http.post<DiagnoseResponse>(`${API_BASE_URL}/diagnose/screenshot`, {
      asSystemRequest: true,
    });
  }

  public migrateReportingIndicesIlmPolicy() {
    return this.http.put(`${API_MIGRATE_ILM_POLICY_URL}`);
  }
}
