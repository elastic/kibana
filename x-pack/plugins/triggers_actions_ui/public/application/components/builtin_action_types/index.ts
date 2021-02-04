/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServerLogActionType } from './server_log';
import { getSlackActionType } from './slack';
import { getEmailActionType } from './email';
import { getIndexActionType } from './es_index';
import { getPagerDutyActionType } from './pagerduty';
import { getWebhookActionType } from './webhook';
import { TypeRegistry } from '../../type_registry';
import { ActionTypeModel } from '../../../types';
import { getServiceNowITSMActionType, getServiceNowSIRActionType } from './servicenow';
import { getJiraActionType } from './jira';
import { getResilientActionType } from './resilient';
import { getTeamsActionType } from './teams';

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
  actionTypeRegistry.register(getWebhookActionType());
  actionTypeRegistry.register(getServiceNowITSMActionType());
  actionTypeRegistry.register(getServiceNowSIRActionType());
  actionTypeRegistry.register(getJiraActionType());
  actionTypeRegistry.register(getResilientActionType());
  actionTypeRegistry.register(getTeamsActionType());
}
