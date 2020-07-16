/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistry } from '../action_type_registry';
import { ActionsConfigurationUtilities } from '../actions_config';
import { Logger } from '../../../../../src/core/server';
import { ActionType } from '../types';

import { getActionType as getEmailActionType } from './email';
import { getActionType as getIndexActionType } from './es_index';
import { getActionType as getPagerDutyActionType } from './pagerduty';
import { getActionType as getServerLogActionType } from './server_log';
import { getActionType as getSlackActionType } from './slack';
import { getActionType as getWebhookActionType } from './webhook';
import { getActionType as getServiceNowActionType } from './servicenow';
import { getActionType as getJiraActionType } from './jira';
import { getActionType as getResilientActionType } from './resilient';

export function registerBuiltInActionTypes({
  actionsConfigUtils: configurationUtilities,
  actionTypeRegistry,
  logger,
}: {
  actionsConfigUtils: ActionsConfigurationUtilities;
  actionTypeRegistry: ActionTypeRegistry;
  logger: Logger;
}) {
  actionTypeRegistry.register(
    (getEmailActionType({ logger, configurationUtilities }) as unknown) as ActionType
  );
  actionTypeRegistry.register((getIndexActionType({ logger }) as unknown) as ActionType);
  actionTypeRegistry.register(
    (getPagerDutyActionType({ logger, configurationUtilities }) as unknown) as ActionType
  );
  actionTypeRegistry.register((getServerLogActionType({ logger }) as unknown) as ActionType);
  actionTypeRegistry.register(
    (getSlackActionType({ configurationUtilities }) as unknown) as ActionType
  );
  actionTypeRegistry.register(
    (getWebhookActionType({ logger, configurationUtilities }) as unknown) as ActionType
  );
  actionTypeRegistry.register(getServiceNowActionType({ logger, configurationUtilities }));
  actionTypeRegistry.register(getJiraActionType({ configurationUtilities }));
  actionTypeRegistry.register(getResilientActionType({ configurationUtilities }));
}
