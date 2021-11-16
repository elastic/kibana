/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '../../../security/server';
import type { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/server';
import { CustomIntegrationsPluginSetup } from '../../../../../src/plugins/custom_integrations/server';
import { HomeServerPluginSetup } from '../../../../../src/plugins/home/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '../../../../../src/plugins/data/server';

export interface StartDeps {
  security?: SecurityPluginStart;
  data: DataPluginStart;
}
export interface SetupDeps {
  usageCollection: UsageCollectionSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
  home?: HomeServerPluginSetup;
  data: DataPluginSetup;
}
