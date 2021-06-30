/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NotificationsSetup } from 'src/core/public';
import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JOB_STATUSES } from '../../common/constants';
import { JobId, JobSummary, JobSummarySet, ReportDocument } from '../../common/types';
import {
  getFailureToast,
  getGeneralErrorToast,
  getSuccessToast,
  getWarningFormulasToast,
  getWarningMaxSizeToast,
} from '../notifier';
import { ReportingAPIClient } from './reporting_api_client';

function updateStored(jobIds: JobId[]): void {
  sessionStorage.setItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY, JSON.stringify(jobIds));
}

function getReportStatus(src: ReportDocument): JobSummary {
  return {
    id: src._id,
    status: src._source.status,
    title: src._source.payload.title,
    jobtype: src._source.jobtype,
    maxSizeReached: src._source.output?.max_size_reached,
    csvContainsFormulas: src._source.output?.csv_contains_formulas,
  };
}

export class ReportingNotifierStreamHandler {
  constructor(private notifications: NotificationsSetup, private apiClient: ReportingAPIClient) {}

  /*
   * Use Kibana Toast API to show our messages
   */
  public showNotifications({
    completed: completedJobs,
    failed: failedJobs,
  }: JobSummarySet): Rx.Observable<JobSummarySet> {
    const showNotificationsAsync = async () => {
      // notifications with download link
      for (const job of completedJobs) {
        if (job.csvContainsFormulas) {
          this.notifications.toasts.addWarning(
            getWarningFormulasToast(
              job,
              this.apiClient.getManagementLink,
              this.apiClient.getDownloadLink
            )
          );
        } else if (job.maxSizeReached) {
          this.notifications.toasts.addWarning(
            getWarningMaxSizeToast(
              job,
              this.apiClient.getManagementLink,
              this.apiClient.getDownloadLink
            )
          );
        } else {
          this.notifications.toasts.addSuccess(
            getSuccessToast(job, this.apiClient.getManagementLink, this.apiClient.getDownloadLink)
          );
        }
      }

      // no download link available
      for (const job of failedJobs) {
        const { content } = await this.apiClient.getContent(job.id);
        this.notifications.toasts.addDanger(
          getFailureToast(content, job, this.apiClient.getManagementLink)
        );
      }
      return { completed: completedJobs, failed: failedJobs };
    };

    return Rx.from(showNotificationsAsync()); // convert Promise to Observable, for the convenience of the main stream
  }

  /*
   * An observable that finds jobs that are known to be "processing" (stored in
   * session storage) but have non-processing job status on the server
   */
  public findChangedStatusJobs(storedJobs: JobId[]): Rx.Observable<JobSummarySet> {
    return Rx.from(this.apiClient.findForJobIds(storedJobs)).pipe(
      map((jobs: ReportDocument[]) => {
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
            if (jobStatus === JOB_STATUSES.COMPLETED || jobStatus === JOB_STATUSES.WARNINGS) {
              completedJobs.push(getReportStatus(job));
            } else if (jobStatus === JOB_STATUSES.FAILED) {
              failedJobs.push(getReportStatus(job));
            } else {
              pending.push(jobId);
            }
          }
        }
        updateStored(pending); // refresh the storage of pending job IDs, minus completed and failed job IDs

        return { completed: completedJobs, failed: failedJobs };
      }),
      catchError((err) => {
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
