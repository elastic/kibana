/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkChatAppPluginSetup } from '@kbn/workchat-app/server';

export interface WorkchatDataConnectorsPluginSetupDependencies {
  workchatApp: WorkChatAppPluginSetup;
}

export interface WorkchatDataConnectorsPluginStartDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkchatDataConnectorsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkchatDataConnectorsPluginStart {}
