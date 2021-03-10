/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { CaseResponse, ConnectorTypes } from '../../common/api';
import { CasesClientGetAlertsResponse } from '../client/alerts/types';
import {
  CaseServiceSetup,
  CaseConfigureServiceSetup,
  CaseUserActionServiceSetup,
  ConnectorMappingsServiceSetup,
  AlertServiceContract,
} from '../services';
import { RegisterActionType } from '../types';

export {
  ContextTypeGeneratedAlertType,
  CommentSchemaType,
  ContextTypeAlertSchemaType,
} from './case/schema';

export interface GetActionTypeParams {
  logger: Logger;
  caseService: CaseServiceSetup;
  caseConfigureService: CaseConfigureServiceSetup;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  alertsService: AlertServiceContract;
}

export interface RegisterConnectorsArgs extends GetActionTypeParams {
  registerActionType: RegisterActionType;
}

export type FormatterConnectorTypes = Exclude<ConnectorTypes, ConnectorTypes.none>;

export interface ExternalServiceFormatter<TExternalServiceParams = {}> {
  format: (theCase: CaseResponse, alerts: CasesClientGetAlertsResponse) => TExternalServiceParams;
}

export type ExternalServiceFormatterMapper = {
  [x in FormatterConnectorTypes]: ExternalServiceFormatter;
};
