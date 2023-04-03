/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraPublicConfig } from '../../../common/plugin_config_types';
import { LogsAppClient } from './logs_app_client';
import { LogsAppServiceStartDeps, LogsAppServiceSetup, LogsAppServiceStart } from './types';

export class LogsAppService {
  constructor(private readonly config: InfraPublicConfig) {}

  public setup(): LogsAppServiceSetup {}

  public start({ discover }: LogsAppServiceStartDeps): LogsAppServiceStart {
    const client = new LogsAppClient(discover);

    return {
      client,
      isLogsUiApp: this.isLogsUiApp,
      isDiscoverApp: this.isDiscoverApp,
    };
  }

  private isLogsUiApp = () => this.config.logs.app_target === 'logs-ui';

  private isDiscoverApp = () => this.config.logs.app_target === 'discover';
}
