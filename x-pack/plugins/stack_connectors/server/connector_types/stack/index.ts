/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getConnectorType as getEmailConnectorType,
  ConnectorTypeId as EmailConnectorTypeId,
} from './email';
export type { ActionParamsType as EmailActionParams } from './email';

export {
  getConnectorType as getIndexConnectorType,
  ConnectorTypeId as IndexConnectorTypeId,
} from './es_index';
export type { ActionParamsType as IndexActionParams } from './es_index';

export {
  getConnectorType as getPagerDutyConnectorType,
  ConnectorTypeId as PagerDutyConnectorTypeId,
} from './pagerduty';
export type { ActionParamsType as PagerDutyActionParams } from './pagerduty';

export {
  getConnectorType as getServerLogConnectorType,
  ConnectorTypeId as ServerLogConnectorTypeId,
} from './server_log';
export type { ActionParamsType as ServerLogActionParams } from './server_log';

export { getServiceNowITOMConnectorType, ServiceNowITOMConnectorTypeId } from './servicenow_itom';

export {
  getConnectorType as getSlackConnectorType,
  ConnectorTypeId as SlackConnectorTypeId,
} from './slack';
export type { ActionParamsType as SlackActionParams } from './slack';

export {
  getConnectorType as getTeamsConnectorType,
  ConnectorTypeId as TeamsConnectorTypeId,
} from './teams';
export type { ActionParamsType as TeamsActionParams } from './teams';

export {
  getConnectorType as getWebhookConnectorType,
  ConnectorTypeId as WebhookConnectorTypeId,
} from './webhook';
export type { ActionParamsType as WebhookActionParams } from './webhook';

export { getOpsgenieConnectorType } from './opsgenie';
export type {
  OpsgenieActionConfig,
  OpsgenieActionSecrets,
  OpsgenieActionParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieCreateAlertSubActionParams,
  OpsgenieCloseAlertParams,
  OpsgenieCreateAlertParams,
} from './opsgenie';

export {
  getConnectorType as getXmattersConnectorType,
  ConnectorTypeId as XmattersConnectorTypeId,
} from './xmatters';
export type { ActionParamsType as XmattersActionParams } from './xmatters';

export { getActionType as getTorqConnectorType, ActionTypeId as TorqConnectorTypeId } from './torq';
export type { ActionParamsType as TorqActionParams } from './torq';
