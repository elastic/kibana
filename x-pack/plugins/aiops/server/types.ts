/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetup, PluginStart } from '@kbn/data-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

export interface AiopsPluginSetupDeps {
  data: PluginSetup;
  licensing: LicensingPluginStart;
}

export interface AiopsPluginStartDeps {
  data: PluginStart;
}

/**
 * aiops plugin server setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiopsPluginSetup {}

/**
 * aiops plugin server start contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiopsPluginStart {}

export interface AiopsLicense {
  isActivePlatinumLicense: boolean;
}
