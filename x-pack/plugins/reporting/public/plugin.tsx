/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import * as Rx from 'rxjs';
import { catchError, filter, map, mergeMap, takeUntil } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  NotificationsSetup,
  Plugin,
  PluginInitializerContext,
} from 'src/core/public';
import { UiActionsSetup } from 'src/plugins/ui_actions/public';
import { CONTEXT_MENU_TRIGGER } from '../../../../src/plugins/embeddable/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SharePluginSetup } from '../../../../src/plugins/share/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { JobId, JobStatusBuckets, ReportingConfigType } from '../common/types';
import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY } from '../constants';
import { getGeneralErrorToast } from './components';
import { ReportListing } from './components/report_listing';
import { ReportingAPIClient } from './lib/reporting_api_client';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';
import { GetCsvReportPanelAction } from './panel_actions/get_csv_panel_action';
import { csvReportingProvider } from './share_context_menu/register_csv_reporting';
import { reportingPDFPNGProvider } from './share_context_menu/register_pdf_png_reporting';

export interface ClientConfigType {
  poll: ReportingConfigType['poll'];
}

function getStored(): JobId[] {
  const sessionValue = sessionStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
  return sessionValue ? JSON.parse(sessionValue) : [];
}

function handleError(
  notifications: NotificationsSetup,
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

export class ReportingPublicPlugin implements Plugin<void, void> {
  private config: ClientConfigType;
  private readonly stop$ = new Rx.ReplaySubject(1);
  private readonly title = i18n.translate('xpack.reporting.management.reportingTitle', {
    defaultMessage: 'Reporting',
  });
  private readonly breadcrumbText = i18n.translate('xpack.reporting.breadcrumb', {
    defaultMessage: 'Reporting',
  });

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
  }

  public setup(
    core: CoreSetup,
    {
      home,
      management,
      licensing,
      uiActions,
      share,
    }: {
      home: HomePublicPluginSetup;
      management: ManagementSetup;
      licensing: LicensingPluginSetup;
      uiActions: UiActionsSetup;
      share: SharePluginSetup;
    }
  ) {
    const {
      http,
      notifications: { toasts },
      getStartServices,
      uiSettings,
    } = core;
    const { license$ } = licensing;

    const apiClient = new ReportingAPIClient(http);
    const action = new GetCsvReportPanelAction(core, license$);

    home.featureCatalogue.register({
      id: 'reporting',
      title: i18n.translate('xpack.reporting.registerFeature.reportingTitle', {
        defaultMessage: 'Reporting',
      }),
      description: i18n.translate('xpack.reporting.registerFeature.reportingDescription', {
        defaultMessage: 'Manage your reports generated from Discover, Visualize, and Dashboard.',
      }),
      icon: 'reportingApp',
      path: '/app/management/insightsAndAlerting/reporting',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN,
    });
    management.sections.section.insightsAndAlerting.registerApp({
      id: 'reporting',
      title: this.title,
      order: 1,
      mount: async (params) => {
        const [start] = await getStartServices();
        params.setBreadcrumbs([{ text: this.breadcrumbText }]);
        ReactDOM.render(
          <I18nProvider>
            <ReportListing
              toasts={toasts}
              license$={license$}
              pollConfig={this.config.poll}
              redirect={start.application.navigateToApp}
              apiClient={apiClient}
            />
          </I18nProvider>,
          params.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(params.element);
        };
      },
    });

    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, action);

    share.register(csvReportingProvider({ apiClient, toasts, license$, uiSettings }));
    share.register(
      reportingPDFPNGProvider({
        apiClient,
        toasts,
        license$,
        uiSettings,
      })
    );
  }

  public start(core: CoreStart) {
    const { http, notifications } = core;
    const apiClient = new ReportingAPIClient(http);
    const streamHandler = new StreamHandler(notifications, apiClient);
    const { interval } = this.config.poll.jobsRefresh;

    Rx.timer(0, interval)
      .pipe(
        takeUntil(this.stop$), // stop the interval when stop method is called
        map(() => getStored()), // read all pending job IDs from session storage
        filter((storedJobs) => storedJobs.length > 0), // stop the pipeline here if there are none pending
        mergeMap((storedJobs) => streamHandler.findChangedStatusJobs(storedJobs)), // look up the latest status of all pending jobs on the server
        mergeMap(({ completed, failed }) => streamHandler.showNotifications({ completed, failed })),
        catchError((err) => handleError(notifications, err))
      )
      .subscribe();
  }

  public stop() {
    this.stop$.next();
  }
}

export type Setup = ReturnType<ReportingPublicPlugin['setup']>;
export type Start = ReturnType<ReportingPublicPlugin['start']>;
