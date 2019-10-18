/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import {
  JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY,
  JOB_STATUS_COMPLETED,
  JOB_STATUS_FAILED,
  API_BASE_URL,
  REPORTING_MANAGEMENT_HOME,
} from '../../constants';
import {
  JobId,
  JobSummary,
  JobStatusBuckets,
  HttpService,
  NotificationsService,
  SourceJob,
  DownloadReportFn,
  ManagementLinkFn,
} from '../../index.d';
import {
  getSuccessToast,
  getFailureToast,
  getWarningFormulasToast,
  getWarningMaxSizeToast,
  getGeneralErrorToast,
} from '../components';
import { jobQueueClient as defaultJobQueueClient } from './job_queue';

function updateStored(jobIds: JobId[]): void {
  sessionStorage.setItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JSON.stringify(jobIds));
}

function summarizeJob(src: SourceJob): JobSummary {
  return {
    id: src._id,
    status: src._source.status,
    title: src._source.payload.title,
    type: src._source.payload.type,
    maxSizeReached: src._source.output.max_size_reached,
    csvContainsFormulas: src._source.output.csv_contains_formulas,
  };
}

export class ReportingNotifierStreamHandler {
  private getManagementLink: ManagementLinkFn;
  private getDownloadLink: DownloadReportFn;

  constructor(
    private http: HttpService,
    private notifications: NotificationsService,
    private jobQueueClient = defaultJobQueueClient
  ) {
    this.getManagementLink = () => {
      return http.basePath.prepend(REPORTING_MANAGEMENT_HOME);
    };
    this.getDownloadLink = (jobId: JobId) => {
      return http.basePath.prepend(`${API_BASE_URL}/download/${jobId}`);
    };
  }

  /*
   * Use Kibana Toast API to show our messages
   */
  public showNotifications({
    completed: completedJobs,
    failed: failedJobs,
  }: JobStatusBuckets): Rx.Observable<JobStatusBuckets> {
    const showNotificationsAsync = async () => {
      // notifications with download link
      for (const job of completedJobs) {
        if (job.csvContainsFormulas) {
          this.notifications.toasts.addWarning(
            getWarningFormulasToast(job, this.getManagementLink, this.getDownloadLink)
          );
        } else if (job.maxSizeReached) {
          this.notifications.toasts.addWarning(
            getWarningMaxSizeToast(job, this.getManagementLink, this.getDownloadLink)
          );
        } else {
          this.notifications.toasts.addSuccess(
            getSuccessToast(job, this.getManagementLink, this.getDownloadLink)
          );
        }
      }

      // no download link available
      for (const job of failedJobs) {
        const content = await this.jobQueueClient.getContent(this.http, job.id);
        this.notifications.toasts.addDanger(getFailureToast(content, job, this.getManagementLink));
      }
      return { completed: completedJobs, failed: failedJobs };
    };

    return Rx.from(showNotificationsAsync()); // convert Promise to Observable, for the convenience of the main stream
  }

  /*
   * An observable that finds jobs that are known to be "processing" (stored in
   * session storage) but have non-processing job status on the server
   */
  public findChangedStatusJobs(storedJobs: JobId[]): Rx.Observable<JobStatusBuckets> {
    return Rx.from(this.jobQueueClient.findForJobIds(this.http, storedJobs)).pipe(
      map((jobs: SourceJob[]) => {
        const completedJobs: JobSummary[] = [];
        const failedJobs: JobSummary[] = [];
        const pending: JobId[] = [];

        // add side effects to storage
        for (const job of jobs) {
          const {
            _id: jobId,
            _source: { status: jobStatus },
          } = job;
          if (storedJobs.includes(jobId)) {
            if (jobStatus === JOB_STATUS_COMPLETED) {
              completedJobs.push(summarizeJob(job));
            } else if (jobStatus === JOB_STATUS_FAILED) {
              failedJobs.push(summarizeJob(job));
            } else {
              pending.push(jobId);
            }
          }
        }
        updateStored(pending); // refresh the storage of pending job IDs, minus completed and failed job IDs

        return { completed: completedJobs, failed: failedJobs };
      }),
      catchError(err => {
        // show connection refused toast
        this.notifications.toasts.addDanger(
          getGeneralErrorToast(
            i18n.translate('xpack.reporting.publicNotifier.httpErrorMessage', {
              defaultMessage: 'Could not check Reporting job status!',
            }),
            err
          )
        ); // prettier-ignore
        window.console.error(err);
        return Rx.of({ completed: [], failed: [] }); // log the error and resume
      })
    );
  }
}
