/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import {
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ActionType,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../actions/server/types';
import { CaseResponse, ConnectorTypes } from '../../common';
import { CasesClientGetAlertsResponse } from '../client/alerts/types';
import {
  CaseServiceSetup,
  CaseConfigureServiceSetup,
  CaseUserActionServiceSetup,
  ConnectorMappingsServiceSetup,
  AlertServiceContract,
} from '../services';

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
  actionsRegisterType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;
}

export type FormatterConnectorTypes = Exclude<ConnectorTypes, ConnectorTypes.none>;

export interface ExternalServiceFormatter<TExternalServiceParams = {}> {
  format: (theCase: CaseResponse, alerts: CasesClientGetAlertsResponse) => TExternalServiceParams;
}

export type ExternalServiceFormatterMapper = {
  [x in FormatterConnectorTypes]: ExternalServiceFormatter;
};
