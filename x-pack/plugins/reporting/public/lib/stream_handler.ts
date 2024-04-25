/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { catchError, filter, map, mergeMap, takeUntil } from 'rxjs';

import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { JOB_STATUS } from '@kbn/reporting-common';
import { JobId } from '@kbn/reporting-common/types';

import { Job, ReportingAPIClient, jobCompletionNotifications } from '@kbn/reporting-public';
import {
  getFailureToast,
  getGeneralErrorToast,
  getSuccessToast,
  getWarningFormulasToast,
  getWarningMaxSizeToast,
  getWarningToast,
} from '../notifier';
import { JobSummary, JobSummarySet } from '../types';

/**
 * @todo Replace with `Infinity` once elastic/eui#5945 is resolved.
 * @see https://github.com/elastic/eui/issues/5945
 */
const COMPLETED_JOB_TOAST_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

function getReportStatus(src: Job): JobSummary {
  return {
    id: src.id,
    status: src.status,
    title: src.title,
    jobtype: src.prettyJobTypeName ?? src.jobtype,
    maxSizeReached: src.max_size_reached,
    csvContainsFormulas: src.csv_contains_formulas,
    errorCode: src.error_code,
  };
}

function handleError(core: CoreStart, err: Error): Rx.Observable<JobSummarySet> {
  core.notifications.toasts.addDanger(
    getGeneralErrorToast(
      i18n.translate('xpack.reporting.publicNotifier.pollingErrorMessage', {
        defaultMessage: 'Reporting notifier error!',
      }),
      err,
      core
    )
  );
  window.console.error(err);
  return Rx.of({ completed: [], failed: [] });
}

export class ReportingNotifierStreamHandler {
  private jobCompletionNotifications = jobCompletionNotifications();

  constructor(private apiClient: ReportingAPIClient, private core: CoreStart) {}

  public startPolling(interval: number, stop$: Rx.Observable<void>) {
    Rx.timer(0, interval)
      .pipe(
        takeUntil(stop$), // stop the interval when stop method is called
        map(this.jobCompletionNotifications.getPendingJobIds), // read all pending job IDs from session storage
        filter((previousPending) => previousPending.length > 0), // stop the pipeline here if there are none pending
        mergeMap((previousPending) => this.findChangedStatusJobs(previousPending)), // look up the latest status of all pending jobs on the server
        mergeMap(({ completed, failed }) => this.showNotifications({ completed, failed })),
        catchError((err) => {
          // eslint-disable-next-line no-console
          console.error(err);
          return handleError(this.core, err);
        })
      )
      .subscribe();
  }

  /*
   * Use Kibana Toast API to show our messages
   */
  protected showNotifications({
    completed: completedJobs,
    failed: failedJobs,
  }: JobSummarySet): Rx.Observable<JobSummarySet> {
    const notifications = this.core.notifications;
    const apiClient = this.apiClient;
    const core = this.core;
    const docLinks = this.core.docLinks;
    const getManagementLink = apiClient.getManagementLink.bind(apiClient);
    const getDownloadLink = apiClient.getDownloadLink.bind(apiClient);

    const showNotificationsAsync = async () => {
      const completedOptions = { toastLifeTimeMs: COMPLETED_JOB_TOAST_TIMEOUT };

      // notifications with download link
      for (const job of completedJobs ?? []) {
        if (job.csvContainsFormulas) {
          notifications.toasts.addWarning(
            getWarningFormulasToast(job, getManagementLink, getDownloadLink, core),
            completedOptions
          );
        } else if (job.maxSizeReached) {
          notifications.toasts.addWarning(
            getWarningMaxSizeToast(job, getManagementLink, getDownloadLink, core),
            completedOptions
          );
        } else if (job.status === JOB_STATUS.WARNINGS) {
          notifications.toasts.addWarning(
            getWarningToast(job, getManagementLink, getDownloadLink, core),
            completedOptions
          );
        } else {
          notifications.toasts.addSuccess(
            getSuccessToast(job, getManagementLink, getDownloadLink, core),
            completedOptions
          );
        }
      }

      // no download link available
      for (const job of failedJobs ?? []) {
        const errorText = await apiClient.getError(job.id);
        notifications.toasts.addDanger(
          getFailureToast(errorText, job, getManagementLink, docLinks, core)
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
  protected findChangedStatusJobs(previousPending: JobId[]): Rx.Observable<JobSummarySet> {
    return Rx.from(this.apiClient.findForJobIds(previousPending)).pipe(
      mergeMap(async (jobs) => {
        const newCompleted: JobSummary[] = [];
        const newFailed: JobSummary[] = [];
        const newPending: JobId[] = [];

        for (const pendingJobId of previousPending) {
          const updatedJob = jobs.find(({ id }) => id === pendingJobId);
          if (
            updatedJob?.status === JOB_STATUS.COMPLETED ||
            updatedJob?.status === JOB_STATUS.WARNINGS
          ) {
            newCompleted.push(getReportStatus(updatedJob));
          } else if (updatedJob?.status === JOB_STATUS.FAILED) {
            newFailed.push(getReportStatus(updatedJob));
          } else {
            // Keep job tracked in storage if is pending. It also
            // may not be present in apiClient.findForJobIds
            // response if index refresh is slow
            newPending.push(pendingJobId);
          }
        }

        // refresh the storage of pending job IDs, minus
        // the newly completed and failed jobs
        this.jobCompletionNotifications.setPendingJobIds(newPending);

        return { completed: newCompleted, failed: newFailed };
      }),
      catchError((err) => {
        // show connection refused toast
        this.core.notifications.toasts.addDanger(
          getGeneralErrorToast(
            i18n.translate('xpack.reporting.publicNotifier.httpErrorMessage', {
              defaultMessage: 'Could not check Reporting job status!',
            }),
            err,
            this.core
          )
        );
        window.console.error(err);
        return Rx.of({});
      })
    );
  }
}
