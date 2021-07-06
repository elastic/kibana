/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import { catchError, filter, map, mergeMap, takeUntil } from 'rxjs/operators';
import {
  CoreSetup,
  CoreStart,
  NotificationsSetup,
  Plugin,
  PluginInitializerContext,
} from 'src/core/public';
import { CONTEXT_MENU_TRIGGER } from '../../../../src/plugins/embeddable/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from '../../../../src/plugins/home/public';
import { ManagementSetup, ManagementStart } from '../../../../src/plugins/management/public';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/public';
import { constants, getDefaultLayoutSelectors } from '../common';
import { durationToNumber } from '../common/schema_utils';
import { JobId, JobSummarySet } from '../common/types';
import { ReportingSetup, ReportingStart } from './';
import { ReportingAPIClient } from './lib/reporting_api_client';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';
import { getGeneralErrorToast } from './notifier';
import { ReportingCsvPanelAction } from './panel_actions/get_csv_panel_action';
import { getSharedComponents } from './shared';
import { ReportingCsvShareProvider } from './share_context_menu/register_csv_reporting';
import { reportingScreenshotShareProvider } from './share_context_menu/register_pdf_png_reporting';

import type {
  SharePluginSetup,
  SharePluginStart,
  UiActionsSetup,
  UiActionsStart,
} from './shared_imports';

export interface ClientConfigType {
  poll: { jobsRefresh: { interval: number; intervalErrorMultiplier: number } };
  roles: { enabled: boolean };
}

function getStored(): JobId[] {
  const sessionValue = sessionStorage.getItem(constants.JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
  return sessionValue ? JSON.parse(sessionValue) : [];
}

function handleError(notifications: NotificationsSetup, err: Error): Rx.Observable<JobSummarySet> {
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

export interface ReportingPublicPluginSetupDendencies {
  home: HomePublicPluginSetup;
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
  uiActions: UiActionsSetup;
  share: SharePluginSetup;
}

export interface ReportingPublicPluginStartDendencies {
  home: HomePublicPluginStart;
  management: ManagementStart;
  licensing: LicensingPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
}

export class ReportingPublicPlugin
  implements
    Plugin<
      ReportingSetup,
      ReportingStart,
      ReportingPublicPluginSetupDendencies,
      ReportingPublicPluginStartDendencies
    > {
  private readonly stop$ = new Rx.ReplaySubject(1);
  private readonly title = i18n.translate('xpack.reporting.management.reportingTitle', {
    defaultMessage: 'Reporting',
  });
  private readonly breadcrumbText = i18n.translate('xpack.reporting.breadcrumb', {
    defaultMessage: 'Reporting',
  });
  private config: ClientConfigType;
  private contract?: ReportingSetup;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
  }

  private getContract(core?: CoreSetup) {
    if (core) {
      this.contract = {
        getDefaultLayoutSelectors,
        usesUiCapabilities: () => this.config.roles?.enabled === false,
        components: getSharedComponents(core),
      };
    }

    if (!this.contract) {
      throw new Error(`Setup error in Reporting plugin!`);
    }

    return this.contract;
  }

  public setup(core: CoreSetup, setupDeps: ReportingPublicPluginSetupDendencies) {
    const { http, getStartServices, uiSettings } = core;
    const {
      home,
      management,
      licensing: { license$ },
      share,
      uiActions,
    } = setupDeps;

    const startServices$ = Rx.from(getStartServices());
    const usesUiCapabilities = !this.config.roles.enabled;

    const apiClient = new ReportingAPIClient(http);

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
        params.setBreadcrumbs([{ text: this.breadcrumbText }]);
        const [[start], { mountManagementSection }] = await Promise.all([
          getStartServices(),
          import('./management/mount_management_section'),
        ]);
        return await mountManagementSection(
          core,
          start,
          license$,
          this.config.poll,
          apiClient,
          share.url,
          params
        );
      },
    });

    uiActions.addTriggerAction(
      CONTEXT_MENU_TRIGGER,
      new ReportingCsvPanelAction({ core, startServices$, license$, usesUiCapabilities })
    );

    const reportingStart = this.getContract(core);
    const { toasts } = core.notifications;

    share.register(
      ReportingCsvShareProvider({
        apiClient,
        toasts,
        license$,
        startServices$,
        uiSettings,
        usesUiCapabilities,
      })
    );

    share.register(
      reportingScreenshotShareProvider({
        apiClient,
        toasts,
        license$,
        startServices$,
        uiSettings,
        usesUiCapabilities,
      })
    );

    return reportingStart;
  }

  public start(core: CoreStart) {
    const { http, notifications } = core;
    const apiClient = new ReportingAPIClient(http);
    const streamHandler = new StreamHandler(notifications, apiClient);
    const interval = durationToNumber(this.config.poll.jobsRefresh.interval);
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

    return this.getContract();
  }

  public stop() {
    this.stop$.next();
  }
}

export type Setup = ReturnType<ReportingPublicPlugin['setup']>;
export type Start = ReturnType<ReportingPublicPlugin['start']>;
