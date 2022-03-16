/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  SearchUsageCollector,
} from '../../../../src/plugins/data/public';
import { BfetchPublicSetup } from '../../../../src/plugins/bfetch/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SharePluginStart } from '../../../../src/plugins/share/public';

import { registerSearchSessionsMgmt } from './search/sessions_mgmt';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { createConnectedSearchSessionIndicator } from './search';
import { ConfigSchema } from '../config';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { ScreenshotModePluginStart } from '../../../../src/plugins/screenshot_mode/public';

export interface DataEnhancedSetupDependencies {
  bfetch: BfetchPublicSetup;
  data: DataPublicPluginSetup;
  management: ManagementSetup;
}
export interface DataEnhancedStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
  screenshotMode: ScreenshotModePluginStart;
}

export type DataEnhancedSetup = ReturnType<DataEnhancedPlugin['setup']>;
export type DataEnhancedStart = ReturnType<DataEnhancedPlugin['start']>;

export class DataEnhancedPlugin
  implements Plugin<void, void, DataEnhancedSetupDependencies, DataEnhancedStartDependencies>
{
  private config!: ConfigSchema;
  private readonly storage = new Storage(window.localStorage);
  private usageCollector?: SearchUsageCollector;

  constructor(private initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(
    core: CoreSetup<DataEnhancedStartDependencies>,
    { bfetch, data, management }: DataEnhancedSetupDependencies
  ) {
    this.config = this.initializerContext.config.get<ConfigSchema>();
    if (this.config.search.sessions.enabled) {
      const sessionsConfig = this.config.search.sessions;
      registerSearchSessionsMgmt(
        core,
        sessionsConfig,
        this.initializerContext.env.packageInfo.version,
        { data, management }
      );
    }

    this.usageCollector = data.search.usageCollector;
  }

  public start(core: CoreStart, plugins: DataEnhancedStartDependencies) {
    if (this.config.search.sessions.enabled) {
      core.chrome.setBreadcrumbsAppendExtension({
        content: toMountPoint(
          React.createElement(
            createConnectedSearchSessionIndicator({
              sessionService: plugins.data.search.session,
              application: core.application,
              basePath: core.http.basePath,
              storage: this.storage,
              disableSaveAfterSessionCompletesTimeout: moment
                .duration(this.config.search.sessions.notTouchedTimeout)
                .asMilliseconds(),
              usageCollector: this.usageCollector,
              tourDisabled: plugins.screenshotMode.isScreenshotMode(),
            })
          ),
          { theme$: core.theme.theme$ }
        ),
      });
    }
  }

  public stop() {}
}
