/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import React from 'react';
import ReactDOM from 'react-dom';
import { catchError, filter, map, mergeMap, takeUntil } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { ManagementSetup } from 'src/plugins/management/public';
import { I18nProvider } from '@kbn/i18n/react';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
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
import { ReportListing } from './components/report_listing';
import { getGeneralErrorToast } from './components';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';
import { JobQueueClient } from './lib/job_queue_client';

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

  private readonly title = i18n.translate('xpack.reporting.management.reportingTitle', {
    defaultMessage: 'Reporting',
  });

  private readonly breadcrumbText = i18n.translate('xpack.reporting.breadcrumb', {
    defaultMessage: 'Reporting',
  });

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    {
      home,
      management,
      licensing,
    }: { home: HomePublicPluginSetup; management: ManagementSetup; licensing: LicensingPluginSetup }
  ) {
    home.featureCatalogue.register({
      id: 'reporting',
      title: i18n.translate('xpack.reporting.registerFeature.reportingTitle', {
        defaultMessage: 'Reporting',
      }),
      description: i18n.translate('xpack.reporting.registerFeature.reportingDescription', {
        defaultMessage: 'Manage your reports generated from Discover, Visualize, and Dashboard.',
      }),
      icon: 'reportingApp',
      path: '/app/kibana#/management/kibana/reporting',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN,
    });

    management.sections.getSection('kibana')!.registerApp({
      id: 'reporting',
      title: this.title,
      order: 15,
      mount: async params => {
        const [start] = await core.getStartServices();
        params.setBreadcrumbs([{ text: this.breadcrumbText }]);
        ReactDOM.render(
          <I18nProvider>
            <ReportListing
              toasts={core.notifications.toasts}
              license$={licensing.license$}
              redirect={start.application.navigateToApp}
              jobQueueClient={new JobQueueClient(core.http)}
            />
          </I18nProvider>,
          params.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });
  }

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
