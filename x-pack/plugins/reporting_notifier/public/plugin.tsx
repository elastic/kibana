/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { catchError, filter, map, mergeMap } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import {
  JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG,
  JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY,
} from '../constants';
import { JobId, JobStatusBuckets } from '../index.d';
import { getGeneralErrorToast } from './components';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';

const {
  jobCompletionNotifier: { interval: JOBS_REFRESH_INTERVAL },
} = JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG;

function getStored(): JobId[] {
  const sessionValue = sessionStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
  return sessionValue ? JSON.parse(sessionValue) : [];
}

export class ReportingNotifierPublicPlugin implements Plugin<any, any> {
  private poller$: Rx.Observable<JobStatusBuckets> | null = null;

  // FIXME: License checking: only active, non-expired licenses allowed
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {}

  // FIXME: only perform these actions for authenticated routes
  public start(core: CoreStart) {
    const { http, notifications } = core;
    const httpFn = () => http;
    const notificationsFn = () => notifications;
    const streamHandler = new StreamHandler(httpFn, notificationsFn);

    this.poller$ = Rx.timer(0, JOBS_REFRESH_INTERVAL).pipe(
      map(() => getStored()), // Read all pending job IDs from session storage
      filter((storedJobs: JobId[]) => storedJobs.length > 0), // stop the pipeline here if there are none pending
      mergeMap((storedJobs: JobId[]) => {
        return streamHandler.findChangedStatusJobs(storedJobs); // look up the latest status of all pending jobs on the server
      }),
      map(({ completed, failed }: JobStatusBuckets) => {
        return streamHandler.showNotifications({ completed, failed });
      }),
      catchError(err => {
        // show general toast, log the error and resume
        notificationsFn().toasts.addDanger(
          getGeneralErrorToast(
            i18n.translate('xpack.reportingNotifier.pollingErrorMessage', {
              defaultMessage: 'Reporting notifier error!',
            }),
            err
          )
        );
        window.console.error(err);
        return Rx.of({ completed: [], failed: [] });
      })
    );

    this.poller$.subscribe();
  }

  public stop() {} // cancel poller$
}

export type Setup = ReturnType<ReportingNotifierPublicPlugin['setup']>;
export type Start = ReturnType<ReportingNotifierPublicPlugin['start']>;
