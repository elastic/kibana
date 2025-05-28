/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkChatAppPluginSetup } from '@kbn/workchat-app/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginStart {}

export interface WCISalesforcePluginSetupDependencies {
  workchatApp: WorkChatAppPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginStartDependencies {}
