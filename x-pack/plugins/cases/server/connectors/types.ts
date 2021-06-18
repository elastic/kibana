/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { CaseResponse, ConnectorMappingsAttributes } from '../../common';
import { CasesClientGetAlertsResponse } from '../client/alerts/types';
import { CasesClientFactory } from '../client/factory';
import { RegisterActionType } from '../types';

export {
  ContextTypeGeneratedAlertType,
  CommentSchemaType,
  ContextTypeAlertSchemaType,
} from './case/schema';

export interface GetActionTypeParams {
  logger: Logger;
  factory: CasesClientFactory;
}

export interface RegisterConnectorsArgs extends GetActionTypeParams {
  registerActionType: RegisterActionType;
}

export interface ICasesConnector<TExternalServiceParams = {}> {
  format: (theCase: CaseResponse, alerts: CasesClientGetAlertsResponse) => TExternalServiceParams;
  getMapping: () => ConnectorMappingsAttributes[];
}

export interface CasesConnectorsMap {
  get: (type: string) => ICasesConnector | undefined | null;
}
