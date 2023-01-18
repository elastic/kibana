/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatedEmail, ValidateEmailAddressesOptions } from '@kbn/actions-plugin/common';
import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { getCasesWebhookConnectorType } from './cases_webhook';
import { getEmailConnectorType } from './email';
import { getIndexConnectorType } from './es_index';
import { getJiraConnectorType } from './jira';
import { getOpsgenieConnectorType } from './opsgenie';
import { getPagerDutyConnectorType } from './pagerduty';
import { getResilientConnectorType } from './resilient';
import { getServerLogConnectorType } from './server_log';
import { getServiceNowITOMConnectorType } from './servicenow_itom';
import { getServiceNowITSMConnectorType } from './servicenow_itsm';
import { getServiceNowSIRConnectorType } from './servicenow_sir';
import { getSlackConnectorType } from './slack';
import { getSlackV2ConnectorType } from './new_slack';
import { getSwimlaneConnectorType } from './swimlane';
import { getTeamsConnectorType } from './teams';
import { getTinesConnectorType } from './tines';
import { getWebhookConnectorType } from './webhook';
import { getXmattersConnectorType } from './xmatters';

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
  connectorTypeRegistry.register(getSlackV2ConnectorType());
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
  connectorTypeRegistry.register(getOpsgenieConnectorType());
  connectorTypeRegistry.register(getTeamsConnectorType());
  connectorTypeRegistry.register(getTinesConnectorType());
}
