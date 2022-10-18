/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import {
  getEmailConnectorType,
  getIndexConnectorType,
  getPagerDutyConnectorType,
  getServerLogConnectorType,
  getServiceNowITOMConnectorType,
  getSlackConnectorType,
  getTeamsConnectorType,
  getWebhookConnectorType,
  getOpsgenieConnectorType,
  getXmattersConnectorType,
} from './stack';
import {
  getCasesWebhookConnectorType,
  getJiraConnectorType,
  getResilientConnectorType,
  getServiceNowITSMConnectorType,
  getServiceNowSIRConnectorType,
  getSwimlaneConnectorType,
} from './cases';
export type {
  EmailActionParams,
  IndexActionParams,
  PagerDutyActionParams,
  ServerLogActionParams,
  SlackActionParams,
  TeamsActionParams,
  WebhookActionParams,
  XmattersActionParams,
} from './stack';
export {
  EmailConnectorTypeId,
  IndexConnectorTypeId,
  PagerDutyConnectorTypeId,
  ServiceNowITOMConnectorTypeId,
  ServerLogConnectorTypeId,
  SlackConnectorTypeId,
  TeamsConnectorTypeId,
  WebhookConnectorTypeId,
  XmattersConnectorTypeId,
} from './stack';
export type {
  CasesWebhookActionParams,
  JiraActionParams,
  ResilientActionParams,
  ServiceNowActionParams,
} from './cases';
export {
  CasesWebhookConnectorTypeId,
  JiraConnectorTypeId,
  ResilientConnectorTypeId,
  ServiceNowITSMConnectorTypeId,
  ServiceNowSIRConnectorTypeId,
} from './cases';

export function registerConnectorTypes({
  actions,
  publicBaseUrl,
}: {
  actions: ActionsPluginSetupContract;
  publicBaseUrl?: string;
}) {
  actions.registerType(getEmailConnectorType({ publicBaseUrl }));
  actions.registerType(getIndexConnectorType());
  actions.registerType(getPagerDutyConnectorType());
  actions.registerType(getSwimlaneConnectorType());
  actions.registerType(getServerLogConnectorType());
  actions.registerType(getSlackConnectorType({}));
  actions.registerType(getWebhookConnectorType());
  actions.registerType(getCasesWebhookConnectorType());
  actions.registerType(getXmattersConnectorType());
  actions.registerType(getServiceNowITSMConnectorType());
  actions.registerType(getServiceNowSIRConnectorType());
  actions.registerType(getServiceNowITOMConnectorType());
  actions.registerType(getJiraConnectorType());
  actions.registerType(getResilientConnectorType());
  actions.registerType(getTeamsConnectorType());
  actions.registerSubActionConnectorType(getOpsgenieConnectorType());
}
