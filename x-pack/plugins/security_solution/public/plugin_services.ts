/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, PackageInfo } from '@kbn/core/public';
import { NowProvider, QueryService } from '@kbn/data-plugin/public';
import type { DataPublicPluginStart, QueryStart } from '@kbn/data-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { initTelemetry, TelemetryService } from './common/lib/telemetry';
import { KibanaServices } from './common/lib/kibana/services';
import type { ExperimentalFeatures } from '../common/experimental_features';
import { licenseService } from './common/hooks/use_license';
import { ExperimentalFeaturesService } from './common/experimental_features_service';
import type { PluginContract } from './plugin_contract';
import type { ConfigSettings } from '../common/config_settings';
import { parseConfigSettings } from '../common/config_settings';
import { APP_UI_ID } from '../common/constants';
import { TopValuesPopoverService } from './app/components/top_values_popover/top_values_popover_service';
import type { SecuritySolutionUiConfigType } from './common/types';
import type {
  PluginStart,
  SetupPlugins,
  StartPlugins,
  StartPluginsDependencies,
  StartServices,
} from './types';

export class PluginServices {
  private readonly telemetry: TelemetryService = new TelemetryService();
  private readonly queryService: QueryService = new QueryService();
  private readonly timelineQueryService: QueryService = new QueryService();
  private readonly storage = new Storage(localStorage);
  private readonly sessionStorage = new Storage(sessionStorage);

  private readonly configSettings: ConfigSettings;

  /**
   * For internal use. Specify which version of the Detection Rules fleet package to install
   * when upgrading rules. If not provided, the latest compatible package will be installed,
   * or if running from a dev environment or -SNAPSHOT build, the latest pre-release package
   * will be used (if fleet is available or not within an airgapped environment).
   *
   * Note: This is for `upgrade only`, which occurs by means of the `useUpgradeSecurityPackages`
   * hook when navigating to a Security Solution page. The package version specified in
   * `fleet_packages.json` in project root will always be installed first on Kibana start if
   * the package is not already installed.
   */
  private readonly prebuiltRulesPackageVersion: string | undefined;

  constructor(
    private readonly config: SecuritySolutionUiConfigType,
    private readonly experimentalFeatures: ExperimentalFeatures,
    private readonly contract: PluginContract,
    private readonly packageInfo: PackageInfo
  ) {
    this.configSettings = parseConfigSettings(this.config.offeringSettings ?? {}).settings;
    this.prebuiltRulesPackageVersion = this.config.prebuiltRulesPackageVersion;
  }

  public setup(
    coreSetup: CoreSetup<StartPluginsDependencies, PluginStart>,
    pluginsSetup: SetupPlugins
  ) {
    initTelemetry({ usageCollection: pluginsSetup.usageCollection }, APP_UI_ID);
    this.telemetry.setup(
      { analytics: coreSetup.analytics },
      { prebuiltRulesPackageVersion: this.prebuiltRulesPackageVersion }
    );

    this.queryService.setup({
      uiSettings: coreSetup.uiSettings,
      storage: this.storage,
      nowProvider: new NowProvider(),
    });

    this.timelineQueryService.setup({
      uiSettings: coreSetup.uiSettings,
      storage: this.storage,
      nowProvider: new NowProvider(),
    });
  }

  public start(coreStart: CoreStart, pluginsStart: StartPlugins) {
    ExperimentalFeaturesService.init({ experimentalFeatures: this.experimentalFeatures });
    licenseService.start(pluginsStart.licensing.license$);

    KibanaServices.init({
      ...coreStart,
      ...pluginsStart,
      kibanaBranch: this.packageInfo.branch,
      kibanaVersion: this.packageInfo.version,
      buildFlavor: this.packageInfo.buildFlavor,
      prebuiltRulesPackageVersion: this.prebuiltRulesPackageVersion,
    });
  }

  public stop() {
    this.queryService.stop();
    this.timelineQueryService.stop();
    licenseService.stop();
  }

  public async generateServices(
    coreStart: CoreStart,
    startPlugins: StartPluginsDependencies,
    params?: AppMountParameters<unknown>
  ): Promise<StartServices> {
    const { apm } = await import('@elastic/apm-rum');
    const { SecuritySolutionTemplateWrapper } = await import('./app/home/template_wrapper');

    const { savedObjectsTaggingOss, ...plugins } = startPlugins;

    const customDataService = this.startCustomDataService(
      this.queryService.start({
        uiSettings: coreStart.uiSettings,
        storage: this.storage,
        http: coreStart.http,
      }),
      startPlugins.data
    );

    const timelineDataService = this.startTimelineDataService(
      this.timelineQueryService.start({
        uiSettings: coreStart.uiSettings,
        storage: this.storage,
        http: coreStart.http,
      }),
      startPlugins.data
    );

    return {
      ...coreStart,
      ...plugins,
      ...this.contract.getStartServices(),
      apm,
      configSettings: this.configSettings,
      savedObjectsTagging: savedObjectsTaggingOss.getTaggingApi(),
      storage: this.storage,
      sessionStorage: this.sessionStorage,
      security: startPlugins.security,
      securityLayout: { getPluginWrapper: () => SecuritySolutionTemplateWrapper },
      contentManagement: startPlugins.contentManagement,
      telemetry: this.telemetry.start(),
      customDataService,
      timelineDataService,
      topValuesPopover: new TopValuesPopoverService(),
      ...(params && {
        onAppLeave: params.onAppLeave,
        setHeaderActionMenu: params.setHeaderActionMenu,
      }),
    };
  }

  public getExperimentalFeatures() {
    return this.experimentalFeatures;
  }

  private startCustomDataService = (query: QueryStart, data: DataPublicPluginStart) => {
    // used for creating a custom stateful KQL Query Bar
    const customDataService: DataPublicPluginStart = {
      ...data,
      query,
      // @ts-expect-error
      _name: 'custom',
    };

    // @ts-expect-error
    customDataService.query.filterManager._name = 'customFilterManager';
    return customDataService;
  };

  private startTimelineDataService = (query: QueryStart, data: DataPublicPluginStart) => {
    // Used in the unified timeline
    return {
      ...data,
      query,
    };
  };
}
