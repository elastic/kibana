/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { catchError, filter, map, mergeMap, takeUntil } from 'rxjs/operators';
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
import { JobId, JobStatusBuckets, NotificationsService } from '../index.d';
import { getGeneralErrorToast } from './components';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';

const {
  jobCompletionNotifier: { interval: JOBS_REFRESH_INTERVAL },
} = JOB_COMPLETION_NOTIFICATIONS_POLLER_CONFIG;

function getStored(): JobId[] {
  const sessionValue = sessionStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
  return sessionValue ? JSON.parse(sessionValue) : [];
}

function handleError(
  notifications: NotificationsService,
  err: Error
): Rx.Observable<JobStatusBuckets> {
  notifications.toasts.addDanger(
    getGeneralErrorToast(
      i18n.translate('xpack.reporting.publicNotifier.pollingErrorMessage', {
        defaultMessage: 'Reporting notifier error!',
      }),
      err
    )
  );
  window.console.error(err);
  return Rx.of({ completed: [], failed: [] });
}

export class ReportingPublicPlugin implements Plugin<any, any> {
  private readonly stop$ = new Rx.ReplaySubject(1);

  // FIXME: License checking: only active, non-expired licenses allowed
  // Depends on https://github.com/elastic/kibana/pull/44922
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {}

  // FIXME: only perform these actions for authenticated routes
  // Depends on https://github.com/elastic/kibana/pull/39477
  public start(core: CoreStart) {
    const { http, notifications } = core;
    const streamHandler = new StreamHandler(http, notifications);

    Rx.timer(0, JOBS_REFRESH_INTERVAL)
      .pipe(
        takeUntil(this.stop$), // stop the interval when stop method is called
        map(() => getStored()), // read all pending job IDs from session storage
        filter(storedJobs => storedJobs.length > 0), // stop the pipeline here if there are none pending
        mergeMap(storedJobs => streamHandler.findChangedStatusJobs(storedJobs)), // look up the latest status of all pending jobs on the server
        mergeMap(({ completed, failed }) => streamHandler.showNotifications({ completed, failed })),
        catchError(err => handleError(notifications, err))
      )
      .subscribe();
  }

  public stop() {
    this.stop$.next();
  }
}

export type Setup = ReturnType<ReportingPublicPlugin['setup']>;
export type Start = ReturnType<ReportingPublicPlugin['start']>;
