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
  HttpFn,
  NotificationsFn,
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
import { jobQueueClient } from './job_queue';

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

  constructor(private httpFn: HttpFn, private notificationsFn: NotificationsFn) {
    this.getManagementLink = () => {
      return httpFn().basePath.prepend(REPORTING_MANAGEMENT_HOME);
    };
    this.getDownloadLink = (jobId: JobId) => {
      return httpFn().basePath.prepend(`${API_BASE_URL}/download/${jobId}`);
    };
  }

  /*
   * Use Kibana Toast API to show our messages
   */
  public showNotifications({ completed: completedJobs, failed: failedJobs }: JobStatusBuckets) {
    // notifications with download link
    completedJobs.forEach((job: JobSummary) => {
      if (job.csvContainsFormulas) {
        this.notificationsFn().toasts.addWarning(
          getWarningFormulasToast(job, this.getManagementLink, this.getDownloadLink)
        );
      } else if (job.maxSizeReached) {
        this.notificationsFn().toasts.addWarning(
          getWarningMaxSizeToast(job, this.getManagementLink, this.getDownloadLink)
        );
      } else {
        this.notificationsFn().toasts.addSuccess(
          getSuccessToast(job, this.getManagementLink, this.getDownloadLink)
        );
      }
    });

    // no download link available
    failedJobs.forEach(async (job: JobSummary) => {
      const content = await jobQueueClient.getContent(this.httpFn, job.id);
      this.notificationsFn().toasts.addDanger(
        getFailureToast(content, job, this.getManagementLink)
      );
    });
    return { completed: completedJobs, failed: failedJobs };
  }

  /*
   * An observable that finds jobs that are known to be "processing" (stored in
   * session storage) but have non-processing job status on the server
   */
  public findChangedStatusJobs(storedJobs: JobId[]): Rx.Observable<JobStatusBuckets> {
    return Rx.from(jobQueueClient.findForJobIds(this.httpFn, storedJobs)).pipe(
      map((jobs: SourceJob[]) => {
        const completedJobs: JobSummary[] = [];
        const failedJobs: JobSummary[] = [];
        const pending: JobId[] = [];

        // add side effects to storage
        jobs.forEach((job: SourceJob) => {
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
        });
        updateStored(pending); // refresh the storage of pending job IDs, minus completed and failed job IDs

        return { completed: completedJobs, failed: failedJobs };
      }),
      catchError(err => {
        // show connection refused toast
        this.notificationsFn().toasts.addDanger(
          getGeneralErrorToast(
            i18n.translate('xpack.reportingNotifier.httpErrorMessage', {
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
