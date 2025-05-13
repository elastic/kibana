/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkChatAppPluginSetup } from '@kbn/workchat-app/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCIIndexSourcePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCIIndexSourcePluginStart {}

export interface WCIIndexSourcePluginSetupDependencies {
  workchatApp: WorkChatAppPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCIIndexSourcePluginStartDependencies {}
