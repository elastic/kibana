/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { ActionTypeRegistry } from '../action_type_registry';
import { ActionsConfigurationUtilities } from '../actions_config';

import { getActionType as getEmailActionType } from './email';
import { getActionType as getIndexActionType } from './es_index';
import { getActionType as getPagerDutyActionType } from './pagerduty';
import { getActionType as getSwimlaneActionType } from './swimlane';
import { getActionType as getServerLogActionType } from './server_log';
import { getActionType as getSlackActionType } from './slack';
import { getActionType as getWebhookActionType } from './webhook';
import { getActionType as getCasesWebhookActionType } from './cases_webhook';
import { getActionType as getXmattersActionType } from './xmatters';
import {
  getServiceNowITSMActionType,
  getServiceNowSIRActionType,
  getServiceNowITOMActionType,
} from './servicenow';
import { getActionType as getJiraActionType } from './jira';
import { getActionType as getResilientActionType } from './resilient';
import { getActionType as getTeamsActionType } from './teams';
export type { ActionParamsType as EmailActionParams } from './email';
export { ActionTypeId as EmailActionTypeId } from './email';
export type { ActionParamsType as IndexActionParams } from './es_index';
export { ActionTypeId as IndexActionTypeId } from './es_index';
export type { ActionParamsType as PagerDutyActionParams } from './pagerduty';
export { ActionTypeId as PagerDutyActionTypeId } from './pagerduty';
export type { ActionParamsType as ServerLogActionParams } from './server_log';
export { ActionTypeId as ServerLogActionTypeId } from './server_log';
export type { ActionParamsType as SlackActionParams } from './slack';
export { ActionTypeId as SlackActionTypeId } from './slack';
export type { ActionParamsType as WebhookActionParams } from './webhook';
export type { ActionParamsType as CasesWebhookActionParams } from './cases_webhook';
export { ActionTypeId as CasesWebhookActionTypeId } from './cases_webhook';
export { ActionTypeId as WebhookActionTypeId } from './webhook';
export type { ActionParamsType as XmattersActionParams } from './xmatters';
export { ActionTypeId as XmattersActionTypeId } from './xmatters';
export type { ActionParamsType as ServiceNowActionParams } from './servicenow';
export {
  ServiceNowITSMActionTypeId,
  ServiceNowSIRActionTypeId,
  ServiceNowITOMActionTypeId,
} from './servicenow';
export type { ActionParamsType as JiraActionParams } from './jira';
export { ActionTypeId as JiraActionTypeId } from './jira';
export type { ActionParamsType as ResilientActionParams } from './resilient';
export { ActionTypeId as ResilientActionTypeId } from './resilient';
export type { ActionParamsType as TeamsActionParams } from './teams';
export { ActionTypeId as TeamsActionTypeId } from './teams';

export function registerBuiltInActionTypes({
  actionsConfigUtils: configurationUtilities,
  actionTypeRegistry,
  logger,
  publicBaseUrl,
}: {
  actionsConfigUtils: ActionsConfigurationUtilities;
  actionTypeRegistry: ActionTypeRegistry;
  logger: Logger;
  publicBaseUrl?: string;
}) {
  actionTypeRegistry.register(
    getEmailActionType({ logger, configurationUtilities, publicBaseUrl })
  );
  actionTypeRegistry.register(getIndexActionType({ logger }));
  actionTypeRegistry.register(getPagerDutyActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getSwimlaneActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getServerLogActionType({ logger }));
  actionTypeRegistry.register(getSlackActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getWebhookActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getCasesWebhookActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getXmattersActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getServiceNowITSMActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getServiceNowSIRActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getServiceNowITOMActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getJiraActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getResilientActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getTeamsActionType({ logger, configurationUtilities }));
}
