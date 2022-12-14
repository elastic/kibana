/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  getConnectorType as getCasesWebhookConnectorType,
  ConnectorTypeId as CasesWebhookConnectorTypeId,
} from './cases_webhook';
export type { ActionParamsType as CasesWebhookActionParams } from './cases_webhook';

export {
  getConnectorType as getJiraConnectorType,
  ConnectorTypeId as JiraConnectorTypeId,
} from './jira';
export type { ActionParamsType as JiraActionParams } from './jira';

export {
  getConnectorType as getResilientConnectorType,
  ConnectorTypeId as ResilientConnectorTypeId,
} from './resilient';
export type { ActionParamsType as ResilientActionParams } from './resilient';

export { getServiceNowITSMConnectorType, ServiceNowITSMConnectorTypeId } from './servicenow_itsm';
import type { ActionParamsType as ServiceNowITSMActionParams } from './servicenow_itsm';
export { getServiceNowSIRConnectorType, ServiceNowSIRConnectorTypeId } from './servicenow_sir';
import type { ActionParamsType as ServiceNowSIRActionParams } from './servicenow_sir';
export type ServiceNowActionParams = ServiceNowITSMActionParams | ServiceNowSIRActionParams;

export { getConnectorType as getSwimlaneConnectorType } from './swimlane';
