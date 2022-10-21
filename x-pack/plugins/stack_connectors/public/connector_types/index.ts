/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatedEmail, ValidateEmailAddressesOptions } from '@kbn/actions-plugin/common';
import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import {
  getEmailConnectorType,
  getIndexConnectorType,
  getPagerDutyConnectorType,
  getServerLogConnectorType,
  getServiceNowITOMConnectorType,
  getSlackConnectorType,
  getTeamsConnectorType,
  getWebhookConnectorType,
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

export interface RegistrationServices {
  validateEmailAddresses: (
    addresses: string[],
    options?: ValidateEmailAddressesOptions
  ) => ValidatedEmail[];
}

export function registerConnectorTypes({
  connectorTypeRegistry,
  services,
}: {
  connectorTypeRegistry: TriggersAndActionsUIPublicPluginSetup['actionTypeRegistry'];
  services: RegistrationServices;
}) {
  connectorTypeRegistry.register(getServerLogConnectorType());
  connectorTypeRegistry.register(getSlackConnectorType());
  connectorTypeRegistry.register(getEmailConnectorType(services));
  connectorTypeRegistry.register(getIndexConnectorType());
  connectorTypeRegistry.register(getPagerDutyConnectorType());
  connectorTypeRegistry.register(getSwimlaneConnectorType());
  connectorTypeRegistry.register(getCasesWebhookConnectorType());
  connectorTypeRegistry.register(getWebhookConnectorType());
  connectorTypeRegistry.register(getXmattersConnectorType());
  connectorTypeRegistry.register(getServiceNowITSMConnectorType());
  connectorTypeRegistry.register(getServiceNowITOMConnectorType());
  connectorTypeRegistry.register(getServiceNowSIRConnectorType());
  connectorTypeRegistry.register(getJiraConnectorType());
  connectorTypeRegistry.register(getResilientConnectorType());
  connectorTypeRegistry.register(getTeamsConnectorType());
}
