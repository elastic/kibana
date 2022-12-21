/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetup, PluginStart } from '@kbn/data-plugin/server';
import { PluginStartContract as AlertingPluginStartContract } from '@kbn/alerting-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelinesPluginUI {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TimelinesPluginStart {}

export interface SetupPlugins {
  data: PluginSetup;
  security?: SecurityPluginSetup;
}

export interface StartPlugins {
  data: PluginStart;
  alerting: AlertingPluginStartContract;
}
