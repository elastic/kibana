/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import {
  getEmailConnectorType,
  getIndexConnectorType,
  getPagerDutyConnectorType,
  getServerLogConnectorType,
  getSlackConnectorType,
  getTeamsConnectorType,
  getWebhookConnectorType,
} from './stack';
import {
  getCasesWebhookConnectorType,
  getJiraConnectorType,
  getResilientConnectorType,
  getServiceNowITOMConnectorType,
  getServiceNowITSMConnectorType,
  getServiceNowSIRConnectorType,
  getSwimlaneConnectorType,
  getXmattersConnectorType,
} from './cases';

export type {
  EmailActionParams,
  IndexActionParams,
  PagerDutyActionParams,
  ServerLogActionParams,
  SlackActionParams,
  TeamsActionParams,
  WebhookActionParams,
} from './stack';
export {
  EmailConnectorTypeId,
  IndexConnectorTypeId,
  PagerDutyConnectorTypeId,
  ServerLogConnectorTypeId,
  SlackConnectorTypeId,
  TeamsConnectorTypeId,
  WebhookConnectorTypeId,
} from './stack';
export type {
  CasesWebhookActionParams,
  JiraActionParams,
  ResilientActionParams,
  ServiceNowActionParams,
  XmattersActionParams,
} from './cases';
export {
  CasesWebhookConnectorTypeId,
  JiraConnectorTypeId,
  ResilientConnectorTypeId,
  ServiceNowITOMConnectorTypeId,
  ServiceNowITSMConnectorTypeId,
  ServiceNowSIRConnectorTypeId,
  XmattersConnectorTypeId,
} from './cases';

export function registerConnectorTypes({
  actions,
  logger,
  publicBaseUrl,
}: {
  actions: ActionsPluginSetupContract;
  logger: Logger;
  publicBaseUrl?: string;
}) {
  actions.registerType(getEmailConnectorType({ logger, publicBaseUrl }));
  actions.registerType(getIndexConnectorType({ logger }));
  actions.registerType(getPagerDutyConnectorType({ logger }));
  actions.registerType(getSwimlaneConnectorType({ logger }));
  actions.registerType(getServerLogConnectorType({ logger }));
  actions.registerType(getSlackConnectorType({ logger }));
  actions.registerType(getWebhookConnectorType({ logger }));
  actions.registerType(getCasesWebhookConnectorType({ logger }));
  actions.registerType(getXmattersConnectorType({ logger }));
  actions.registerType(getServiceNowITSMConnectorType({ logger }));
  actions.registerType(getServiceNowSIRConnectorType({ logger }));
  actions.registerType(getServiceNowITOMConnectorType({ logger }));
  actions.registerType(getJiraConnectorType({ logger }));
  actions.registerType(getResilientConnectorType({ logger }));
  actions.registerType(getTeamsConnectorType({ logger }));
}
