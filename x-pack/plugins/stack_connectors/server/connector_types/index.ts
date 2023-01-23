/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { getConnectorType as getCasesWebhookConnectorType } from './cases_webhook';
import { getConnectorType as getJiraConnectorType } from './jira';
import { getConnectorType as getResilientConnectorType } from './resilient';
import { getServiceNowITSMConnectorType } from './servicenow_itsm';
import { getServiceNowSIRConnectorType } from './servicenow_sir';
import { getServiceNowITOMConnectorType } from './servicenow_itom';
import { getTinesConnectorType } from './tines';
import { getConnectorType as getEmailConnectorType } from './email';
import { getConnectorType as getIndexConnectorType } from './es_index';
import { getConnectorType as getPagerDutyConnectorType } from './pagerduty';
import { getConnectorType as getSwimlaneConnectorType } from './swimlane';
import { getConnectorType as getServerLogConnectorType } from './server_log';
import { getConnectorType as getSlackConnectorType } from './slack';
import { getConnectorType as getWebhookConnectorType } from './webhook';
import { getConnectorType as getXmattersConnectorType } from './xmatters';
import { getConnectorType as getTeamsConnectorType } from './teams';
import { getOpsgenieConnectorType } from './opsgenie';
import type { ActionParamsType as ServiceNowITSMActionParams } from './servicenow_itsm';
import type { ActionParamsType as ServiceNowSIRActionParams } from './servicenow_sir';

export { ConnectorTypeId as CasesWebhookConnectorTypeId } from './cases_webhook';
export type { ActionParamsType as CasesWebhookActionParams } from './cases_webhook';
export { ConnectorTypeId as JiraConnectorTypeId } from './jira';
export type { ActionParamsType as JiraActionParams } from './jira';
export { ConnectorTypeId as ResilientConnectorTypeId } from './resilient';
export type { ActionParamsType as ResilientActionParams } from './resilient';
export { ServiceNowITSMConnectorTypeId } from './servicenow_itsm';
export { ServiceNowSIRConnectorTypeId } from './servicenow_sir';
export { ConnectorTypeId as EmailConnectorTypeId } from './email';
export type { ActionParamsType as EmailActionParams } from './email';
export { ConnectorTypeId as IndexConnectorTypeId } from './es_index';
export type { ActionParamsType as IndexActionParams } from './es_index';
export { ConnectorTypeId as PagerDutyConnectorTypeId } from './pagerduty';
export type { ActionParamsType as PagerDutyActionParams } from './pagerduty';
export { ConnectorTypeId as ServerLogConnectorTypeId } from './server_log';
export type { ActionParamsType as ServerLogActionParams } from './server_log';
export { ServiceNowITOMConnectorTypeId } from './servicenow_itom';
export type { ActionParams as SlackActionParams } from '../../common/slack/types';
export { ConnectorTypeId as TeamsConnectorTypeId } from './teams';
export type { ActionParamsType as TeamsActionParams } from './teams';
export { ConnectorTypeId as WebhookConnectorTypeId } from './webhook';
export type { ActionParamsType as WebhookActionParams } from './webhook';
export { ConnectorTypeId as XmattersConnectorTypeId } from './xmatters';
export type { ActionParamsType as XmattersActionParams } from './xmatters';

export type {
  OpsgenieActionConfig,
  OpsgenieActionSecrets,
  OpsgenieActionParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieCreateAlertSubActionParams,
  OpsgenieCloseAlertParams,
  OpsgenieCreateAlertParams,
} from './opsgenie';

export type ServiceNowActionParams = ServiceNowITSMActionParams | ServiceNowSIRActionParams;

export { getConnectorType as getSwimlaneConnectorType } from './swimlane';

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
  actions.registerType(getSlackConnectorType());
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
  actions.registerSubActionConnectorType(getTinesConnectorType());
}
