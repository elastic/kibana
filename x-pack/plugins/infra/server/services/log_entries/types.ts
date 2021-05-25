/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../../../src/plugins/data/server';
import { InfraSources } from '../../lib/sources';

export interface LogEntriesServiceSetupDeps {
  data: DataPluginSetup;
  sources: InfraSources;
}

export interface LogEntriesServiceStartDeps {
  data: DataPluginStart;
}
