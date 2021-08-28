/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionTypeModel } from '../../../types';
import { TypeRegistry } from '../../type_registry';
import { getActionType as getEmailActionType } from './email/email';
import { getActionType as getIndexActionType } from './es_index/es_index';
import { getActionType as getJiraActionType } from './jira/jira';
import { getActionType as getPagerDutyActionType } from './pagerduty/pagerduty';
import { getActionType as getResilientActionType } from './resilient/resilient';
import { getActionType as getServerLogActionType } from './server_log/server_log';
import { getServiceNowITSMActionType, getServiceNowSIRActionType } from './servicenow/servicenow';
import { getActionType as getSlackActionType } from './slack/slack';
import { getActionType as getSwimlaneActionType } from './swimlane/swimlane';
import { getActionType as getTeamsActionType } from './teams/teams';
import { getActionType as getWebhookActionType } from './webhook/webhook';

export function registerBuiltInActionTypes({
  actionTypeRegistry,
}: {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
}) {
  actionTypeRegistry.register(getServerLogActionType());
  actionTypeRegistry.register(getSlackActionType());
  actionTypeRegistry.register(getEmailActionType());
  actionTypeRegistry.register(getIndexActionType());
  actionTypeRegistry.register(getPagerDutyActionType());
  actionTypeRegistry.register(getSwimlaneActionType());
  actionTypeRegistry.register(getWebhookActionType());
  actionTypeRegistry.register(getServiceNowITSMActionType());
  actionTypeRegistry.register(getServiceNowSIRActionType());
  actionTypeRegistry.register(getJiraActionType());
  actionTypeRegistry.register(getResilientActionType());
  actionTypeRegistry.register(getTeamsActionType());
}
