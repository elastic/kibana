/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import { getConnectorType as getEmailConnectorType } from './email';
import { getConnectorType as getIndexConnectorType } from './es_index';
import { getConnectorType as getPagerDutyConnectorType } from './pagerduty';
import { getConnectorType as getSwimlaneConnectorType } from './swimlane';
import { getConnectorType as getServerLogConnectorType } from './server_log';
import { getConnectorType as getSlackConnectorType } from './slack';
import { getConnectorType as getWebhookConnectorType } from './webhook';
import { getConnectorType as getCasesWebhookConnectorType } from './cases_webhook';
import { getConnectorType as getXmattersConnectorType } from './xmatters';
import {
  getServiceNowITSMConnectorType,
  getServiceNowSIRConnectorType,
  getServiceNowITOMConnectorType,
} from './servicenow';
import { getConnectorType as getJiraConnectorType } from './jira';
import { getConnectorType as getResilientConnectorType } from './resilient';
import { getConnectorType as getTeamsConnectorType } from './teams';
export type { ActionParamsType as EmailActionParams } from './email';
export { ConnectorTypeId as EmailConnectorTypeId } from './email';
export type { ActionParamsType as IndexActionParams } from './es_index';
export { ConnectorTypeId as IndexConnectorTypeId } from './es_index';
export type { ActionParamsType as PagerDutyActionParams } from './pagerduty';
export { ConnectorTypeId as PagerDutyConnectorTypeId } from './pagerduty';
export type { ActionParamsType as ServerLogActionParams } from './server_log';
export { ConnectorTypeId as ServerLogConnectorTypeId } from './server_log';
export type { ActionParamsType as SlackActionParams } from './slack';
export { ConnectorTypeId as SlackConnectorTypeId } from './slack';
export type { ActionParamsType as WebhookActionParams } from './webhook';
export type { ActionParamsType as CasesWebhookActionParams } from './cases_webhook';
export { ConnectorTypeId as CasesWebhookConnectorTypeId } from './cases_webhook';
export { ConnectorTypeId as WebhookConnectorTypeId } from './webhook';
export type { ActionParamsType as XmattersActionParams } from './xmatters';
export { ConnectorTypeId as XmattersConnectorTypeId } from './xmatters';
export type { ActionParamsType as ServiceNowActionParams } from './servicenow';
export {
  ServiceNowITSMConnectorTypeId,
  ServiceNowSIRConnectorTypeId,
  ServiceNowITOMConnectorTypeId,
} from './servicenow';
export type { ActionParamsType as JiraActionParams } from './jira';
export { ConnectorTypeId as JiraConnectorTypeId } from './jira';
export type { ActionParamsType as ResilientActionParams } from './resilient';
export { ConnectorTypeId as ResilientConnectorTypeId } from './resilient';
export type { ActionParamsType as TeamsActionParams } from './teams';
export { ConnectorTypeId as TeamsConnectorTypeId } from './teams';

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
