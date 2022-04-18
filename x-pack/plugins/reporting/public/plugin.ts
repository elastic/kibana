/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import * as Rx from 'rxjs';
import { catchError, filter, map, mergeMap, takeUntil } from 'rxjs/operators';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  CoreSetup,
  CoreStart,
  HttpSetup,
  IUiSettingsClient,
  NotificationsSetup,
  Plugin,
  PluginInitializerContext,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from '@kbn/home-plugin/public';
import { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { durationToNumber } from '../common/schema_utils';
import { JobId, JobSummarySet } from '../common/types';
import { ReportingSetup, ReportingStart } from '.';
import { ReportingAPIClient } from './lib/reporting_api_client';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';
import { getGeneralErrorToast } from './notifier';
import { ReportingCsvPanelAction } from './panel_actions/get_csv_panel_action';
import { getSharedComponents } from './shared';
import type {
  SharePluginSetup,
  SharePluginStart,
  UiActionsSetup,
  UiActionsStart,
} from './shared_imports';
import { AppNavLinkStatus } from './shared_imports';
import { reportingCsvShareProvider } from './share_context_menu/register_csv_reporting';
import { reportingScreenshotShareProvider } from './share_context_menu/register_pdf_png_reporting';
import { JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY } from '../common/constants';

export interface ClientConfigType {
  poll: { jobsRefresh: { interval: number; intervalErrorMultiplier: number } };
  roles: { enabled: boolean };
}

function getStored(): JobId[] {
  const sessionValue = sessionStorage.getItem(JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY);
  return sessionValue ? JSON.parse(sessionValue) : [];
}

function handleError(
  notifications: NotificationsSetup,
  err: Error,
  theme: ThemeServiceStart
): Rx.Observable<JobSummarySet> {
  notifications.toasts.addDanger(
    getGeneralErrorToast(
      i18n.translate('xpack.reporting.publicNotifier.pollingErrorMessage', {
        defaultMessage: 'Reporting notifier error!',
      }),
      err,
      theme
    )
  );
  window.console.error(err);
  return Rx.of({ completed: [], failed: [] });
}

export interface ReportingPublicPluginSetupDendencies {
  home: HomePublicPluginSetup;
  management: ManagementSetup;
  uiActions: UiActionsSetup;
  screenshotMode: ScreenshotModePluginSetup;
  share: SharePluginSetup;
}

export interface ReportingPublicPluginStartDendencies {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
  management: ManagementStart;
  licensing: LicensingPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
}

/**
 * @internal
 * @implements Plugin
 */
export class ReportingPublicPlugin
  implements
    Plugin<
      ReportingSetup,
      ReportingStart,
      ReportingPublicPluginSetupDendencies,
      ReportingPublicPluginStartDendencies
    >
{
  private kibanaVersion: string;
  private apiClient?: ReportingAPIClient;
  private readonly stop$ = new Rx.ReplaySubject<void>(1);
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
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  /*
   * Use a single instance of ReportingAPIClient for all the reporting code
   */
  private getApiClient(http: HttpSetup, uiSettings: IUiSettingsClient) {
    if (!this.apiClient) {
      this.apiClient = new ReportingAPIClient(http, uiSettings, this.kibanaVersion);
    }
    return this.apiClient;
  }

  private getContract(core?: CoreSetup) {
    if (core) {
      this.contract = {
        usesUiCapabilities: () => this.config.roles?.enabled === false,
        components: getSharedComponents(core, this.getApiClient(core.http, core.uiSettings)),
      };
    }

    if (!this.contract) {
      throw new Error(`Setup error in Reporting plugin!`);
    }

    return this.contract;
  }

  public setup(
    core: CoreSetup<ReportingPublicPluginStartDendencies>,
    setupDeps: ReportingPublicPluginSetupDendencies
  ) {
    const { getStartServices, uiSettings } = core;
    const { home, management, screenshotMode, share, uiActions } = setupDeps;

    const startServices$ = Rx.from(getStartServices());
    const usesUiCapabilities = !this.config.roles.enabled;

    const apiClient = this.getApiClient(core.http, core.uiSettings);

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
        const [[start, startDeps], { mountManagementSection }] = await Promise.all([
          getStartServices(),
          import('./management/mount_management_section'),
        ]);

        const { docTitle } = start.chrome;
        docTitle.change(this.title);

        const { license$ } = startDeps.licensing;
        const umountAppCallback = await mountManagementSection(
          core,
          start,
          license$,
          this.config.poll,
          apiClient,
          share.url,
          params
        );

        return () => {
          docTitle.reset();
          umountAppCallback();
        };
      },
    });

    core.application.register({
      id: 'reportingRedirect',
      mount: async (params) => {
        const { mountRedirectApp } = await import('./redirect');
        return mountRedirectApp({ ...params, apiClient, screenshotMode, share });
      },
      title: 'Reporting redirect app',
      searchable: false,
      chromeless: true,
      exactRoute: true,
      navLinkStatus: AppNavLinkStatus.hidden,
    });

    uiActions.addTriggerAction(
      CONTEXT_MENU_TRIGGER,
      new ReportingCsvPanelAction({ core, apiClient, startServices$, usesUiCapabilities })
    );

    const reportingStart = this.getContract(core);
    const { toasts } = core.notifications;

    startServices$.subscribe(([{ application }, { licensing }]) => {
      licensing.license$.subscribe((license) => {
        share.register(
          reportingCsvShareProvider({
            apiClient,
            toasts,
            uiSettings,
            license,
            application,
            usesUiCapabilities,
            theme: core.theme,
          })
        );

        share.register(
          reportingScreenshotShareProvider({
            apiClient,
            toasts,
            uiSettings,
            license,
            application,
            usesUiCapabilities,
            theme: core.theme,
          })
        );
      });
    });

    return reportingStart;
  }

  public start(core: CoreStart) {
    const { notifications } = core;
    const apiClient = this.getApiClient(core.http, core.uiSettings);
    const streamHandler = new StreamHandler(notifications, apiClient, core.theme);
    const interval = durationToNumber(this.config.poll.jobsRefresh.interval);
    Rx.timer(0, interval)
      .pipe(
        takeUntil(this.stop$), // stop the interval when stop method is called
        map(() => getStored()), // read all pending job IDs from session storage
        filter((storedJobs) => storedJobs.length > 0), // stop the pipeline here if there are none pending
        mergeMap((storedJobs) => streamHandler.findChangedStatusJobs(storedJobs)), // look up the latest status of all pending jobs on the server
        mergeMap(({ completed, failed }) => streamHandler.showNotifications({ completed, failed })),
        catchError((err) => handleError(notifications, err, core.theme))
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
