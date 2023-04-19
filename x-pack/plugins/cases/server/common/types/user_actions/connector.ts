/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypes } from '../../../../common/api';
import type {
  ConnectorCasesWebhookTypeFields,
  ConnectorJiraTypeFields,
  ConnectorNoneTypeFields,
  ConnectorResilientTypeFields,
  ConnectorServiceNowITSMTypeFields,
  ConnectorServiceNowSIRTypeFields,
  ConnectorSwimlaneTypeFields,
} from '../connectors/connectors';

type CaseUserActionConnector = (
  | ConnectorCasesWebhookTypeFields
  | ConnectorJiraTypeFields
  | ConnectorNoneTypeFields
  | ConnectorResilientTypeFields
  | ConnectorServiceNowITSMTypeFields
  | ConnectorServiceNowSIRTypeFields
  | ConnectorSwimlaneTypeFields
) & {
  name: string;
};

export interface ConnectorUserActionPayload {
  connector: CaseUserActionConnector;
}

export interface ConnectorUserAction {
  type: typeof ActionTypes.connector;
  payload: ConnectorUserActionPayload;
}
