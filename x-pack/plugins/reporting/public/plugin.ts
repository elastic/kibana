/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, map, type Observable, ReplaySubject } from 'rxjs';

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import { i18n } from '@kbn/i18n';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';

import { durationToNumber } from '@kbn/reporting-common';
import type { ClientConfigType } from '@kbn/reporting-public';
import { ReportingAPIClient } from '@kbn/reporting-public';

import {
  getSharedComponents,
  reportingCsvShareModalProvider,
  reportingExportModalProvider,
} from '@kbn/reporting-public/share';
import { ReportingCsvPanelAction } from '@kbn/reporting-csv-share-panel';
import { InjectedIntl } from '@kbn/i18n-react';
import type { ReportingSetup, ReportingStart } from '.';
import { ReportingNotifierStreamHandler as StreamHandler } from './lib/stream_handler';
import { StartServices } from './types';

export interface ReportingPublicPluginSetupDependencies {
  home: HomePublicPluginSetup;
  management: ManagementSetup;
  uiActions: UiActionsSetup;
  screenshotMode: ScreenshotModePluginSetup;
  share: SharePluginSetup;
  intl: InjectedIntl;
}

export interface ReportingPublicPluginStartDependencies {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
  management: ManagementStart;
  licensing: LicensingPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
}

type StartServices$ = Observable<StartServices>;

/**
 * @internal
 * @implements Plugin
 */
export class ReportingPublicPlugin
  implements
    Plugin<
      ReportingSetup,
      ReportingStart,
      ReportingPublicPluginSetupDependencies,
      ReportingPublicPluginStartDependencies
    >
{
  private kibanaVersion: string;
  private apiClient?: ReportingAPIClient;
  private readonly stop$ = new ReplaySubject<void>(1);
  private readonly title = i18n.translate('xpack.reporting.management.reportingTitle', {
    defaultMessage: 'Reporting',
  });
  private readonly breadcrumbText = i18n.translate('xpack.reporting.breadcrumb', {
    defaultMessage: 'Reporting',
  });
  private config: ClientConfigType;
  private contract?: ReportingSetup;
  private startServices$?: StartServices$;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  private getContract(apiClient: ReportingAPIClient, startServices$: StartServices$) {
    this.contract = {
      components: getSharedComponents(apiClient, startServices$),
    };

    if (!this.contract) {
      throw new Error(`Setup error in Reporting plugin!`);
    }

    return this.contract;
  }

  public setup(
    core: CoreSetup<ReportingPublicPluginStartDependencies>,
    setupDeps: ReportingPublicPluginSetupDependencies
  ) {
    const { getStartServices } = core;
    const {
      home: homeSetup,
      management: managementSetup,
      screenshotMode: screenshotModeSetup,
      share: shareSetup,
      uiActions: uiActionsSetup,
    } = setupDeps;

    const startServices$: Observable<StartServices> = from(getStartServices()).pipe(
      map(([services, ...rest]) => {
        return [
          {
            application: services.application,
            analytics: services.analytics,
            i18n: services.i18n,
            theme: services.theme,
            notifications: services.notifications,
            uiSettings: services.uiSettings,
          },
          ...rest,
        ];
      })
    );

    const apiClient = new ReportingAPIClient(core.http, core.uiSettings, this.kibanaVersion);
    this.apiClient = apiClient;

    homeSetup.featureCatalogue.register({
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
      category: 'admin',
    });

    managementSetup.sections.section.insightsAndAlerting.registerApp({
      id: 'reporting',
      title: this.title,
      order: 3,
      keywords: ['reports', 'report', 'reporting'],
      mount: async (params) => {
        params.setBreadcrumbs([{ text: this.breadcrumbText }]);
        const [[coreStart, startDeps], { mountManagementSection }] = await Promise.all([
          getStartServices(),
          import('./management/mount_management_section'),
        ]);

        const { licensing, data, share } = startDeps;
        const { docTitle } = coreStart.chrome;
        docTitle.change(this.title);

        const umountAppCallback = await mountManagementSection(
          coreStart,
          licensing.license$,
          data,
          share,
          this.config,
          apiClient,
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
        const [startServices, importParams] = await Promise.all([
          core.getStartServices(),
          import('./redirect'),
        ]);
        const [coreStart] = startServices;
        const { mountRedirectApp } = importParams;

        return mountRedirectApp(coreStart, {
          ...params,
          apiClient,
          screenshotMode: screenshotModeSetup,
          share: shareSetup,
        });
      },
      title: 'Reporting redirect app',
      chromeless: true,
      exactRoute: true,
      visibleIn: [],
    });

    uiActionsSetup.addTriggerAction(
      CONTEXT_MENU_TRIGGER,
      new ReportingCsvPanelAction({
        core,
        apiClient,
        startServices$,
        csvConfig: this.config.csv,
      })
    );

    startServices$.subscribe(([{ application }, { licensing }]) => {
      licensing.license$.subscribe((license) => {
        shareSetup.register(
          reportingCsvShareModalProvider({
            apiClient,
            license,
            application,
            startServices$,
          })
        );

        if (this.config.export_types.pdf.enabled || this.config.export_types.png.enabled) {
          shareSetup.register(
            reportingExportModalProvider({
              apiClient,
              license,
              application,
              startServices$,
            })
          );
        }
      });
    });

    this.startServices$ = startServices$;
    return this.getContract(apiClient, startServices$);
  }

  public start(core: CoreStart) {
    const streamHandler = new StreamHandler(this.apiClient!, core);
    const interval = durationToNumber(this.config.poll.jobsRefresh.interval);
    streamHandler.startPolling(interval, this.stop$);

    return this.getContract(this.apiClient!, this.startServices$!);
  }

  public stop() {
    this.stop$.next();
  }
}

export type Setup = ReturnType<ReportingPublicPlugin['setup']>;
export type Start = ReturnType<ReportingPublicPlugin['start']>;
