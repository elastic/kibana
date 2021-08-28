/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type { BfetchPublicSetup } from '../../../../src/plugins/bfetch/public/types';
import type { SearchUsageCollector } from '../../../../src/plugins/data/public/search/collectors/types';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public/types';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public/util/to_mount_point';
import { Storage } from '../../../../src/plugins/kibana_utils/public/storage/storage';
import type { ManagementSetup } from '../../../../src/plugins/management/public/types';
import type { SharePluginStart } from '../../../../src/plugins/share/public/plugin';
import type { ConfigSchema } from '../config';
import { registerSearchSessionsMgmt } from './search/sessions_mgmt';
import { createConnectedSearchSessionIndicator } from './search/ui/connected_search_session_indicator/connected_search_session_indicator';

export interface DataEnhancedSetupDependencies {
  bfetch: BfetchPublicSetup;
  data: DataPublicPluginSetup;
  management: ManagementSetup;
}
export interface DataEnhancedStartDependencies {
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

export type DataEnhancedSetup = ReturnType<DataEnhancedPlugin['setup']>;
export type DataEnhancedStart = ReturnType<DataEnhancedPlugin['start']>;

export class DataEnhancedPlugin
  implements Plugin<void, void, DataEnhancedSetupDependencies, DataEnhancedStartDependencies> {
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
            })
          )
        ),
      });
    }
  }

  public stop() {}
}
