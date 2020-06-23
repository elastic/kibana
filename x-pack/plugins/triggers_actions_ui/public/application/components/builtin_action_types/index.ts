/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServerLogActionType } from './server_log';
import { getSlackActionType } from './slack';
import { getEmailActionType } from './email';
import { getIndexActionType } from './es_index';
import { getPagerDutyActionType } from './pagerduty';
import { getWebhookActionType } from './webhook';
import { TypeRegistry } from '../../type_registry';
import { ActionTypeModel } from '../../../types';
import { getServiceNowActionType } from './servicenow';

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
  actionTypeRegistry.register(getServiceNowActionType());
}
