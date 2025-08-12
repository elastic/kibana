/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationConfiguration } from '@kbn/wci-common';
import type { WorkChatAppPluginSetup } from '@kbn/workchat-app/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WCISalesforcePluginStart {}

export interface WCISalesforcePluginSetupDependencies {
  workchatApp: WorkChatAppPluginSetup;
}

export interface WCISalesforcePluginStartDependencies {
  actions: ActionsPluginStart;
}

export interface WCISalesforceConfiguration extends IntegrationConfiguration {
  index: string;
}
