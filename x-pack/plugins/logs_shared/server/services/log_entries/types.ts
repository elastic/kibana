/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import type { LogViewsServiceStart } from '../log_views/types';

export interface LogEntriesServiceSetupDeps {
  data: DataPluginSetup;
}

export interface LogEntriesServicePluginsStartDeps {
  data: DataPluginStart;
}

export interface LogEntriesServicePluginSelfDeps {
  logViews: LogViewsServiceStart;
}
