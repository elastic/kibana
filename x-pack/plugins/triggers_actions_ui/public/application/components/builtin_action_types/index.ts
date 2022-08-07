/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatedEmail, ValidateEmailAddressesOptions } from '@kbn/actions-plugin/common';
import { getServerLogActionType } from './server_log';
import { getSlackActionType } from './slack';
import { getEmailActionType } from './email';
import { getIndexActionType } from './es_index';
import { getPagerDutyActionType } from './pagerduty';
import { getSwimlaneActionType } from './swimlane';
import { getCasesWebhookActionType } from './cases_webhook';
import { getWebhookActionType } from './webhook';
import { getXmattersActionType } from './xmatters';
import { TypeRegistry } from '../../type_registry';
import { ActionTypeModel } from '../../../types';
import {
  getServiceNowITSMActionType,
  getServiceNowSIRActionType,
  getServiceNowITOMActionType,
} from './servicenow';
import { getJiraActionType } from './jira';
import { getResilientActionType } from './resilient';
import { getTeamsActionType } from './teams';

export interface RegistrationServices {
  validateEmailAddresses: (
    addresses: string[],
    options?: ValidateEmailAddressesOptions
  ) => ValidatedEmail[];
}

export function registerBuiltInActionTypes({
  actionTypeRegistry,
  services,
}: {
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  services: RegistrationServices;
}) {
  actionTypeRegistry.register(getServerLogActionType());
  actionTypeRegistry.register(getSlackActionType());
  actionTypeRegistry.register(getEmailActionType(services));
  actionTypeRegistry.register(getIndexActionType());
  actionTypeRegistry.register(getPagerDutyActionType());
  actionTypeRegistry.register(getSwimlaneActionType());
  actionTypeRegistry.register(getCasesWebhookActionType());
  actionTypeRegistry.register(getWebhookActionType());
  actionTypeRegistry.register(getXmattersActionType());
  actionTypeRegistry.register(getServiceNowITSMActionType());
  actionTypeRegistry.register(getServiceNowITOMActionType());
  actionTypeRegistry.register(getServiceNowSIRActionType());
  actionTypeRegistry.register(getJiraActionType());
  actionTypeRegistry.register(getResilientActionType());
  actionTypeRegistry.register(getTeamsActionType());
}
